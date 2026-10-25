begin;

-- Deferred triggers run at commit under the caller, after the provisioning definer has returned.
alter function private.check_workspace_integrity() security definer;
alter function private.check_scope_membership_integrity() security definer;

create table private.auth_rate_limits (
  key text primary key,
  started_at timestamptz not null,
  requests integer not null
);
create table private.otp_challenges (
  email_hash text primary key,
  challenge_id uuid not null,
  sent_at timestamptz not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed boolean not null default false
);
alter table private.auth_rate_limits enable row level security;
alter table private.otp_challenges enable row level security;
revoke all on private.auth_rate_limits, private.otp_challenges from public, anon, authenticated, service_role;

-- Only the server calls this atomic gate. No emails, OTPs or session tokens are stored.
create or replace function public.consume_otp_limit(
  operation text, email_hash text, ip_hash text, challenge_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  challenge private.otp_challenges;
  rate private.auth_rate_limits;
  rate_key text;
  max_requests integer;
begin
  if operation not in ('request', 'verify', 'complete') or char_length(email_hash) <> 64
    or char_length(ip_hash) <> 64 or challenge_id is null then
    raise exception using errcode = '22023', message = 'Invalid authentication gate input';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('otp:' || email_hash, 0));
  select * into challenge from private.otp_challenges c where c.email_hash = consume_otp_limit.email_hash for update;
  if operation = 'complete' then
    update private.otp_challenges c set consumed = true
      where c.email_hash = consume_otp_limit.email_hash and c.challenge_id = consume_otp_limit.challenge_id;
    return '{"allowed":true}'::jsonb;
  end if;
  if operation = 'verify' then
    if challenge.challenge_id is distinct from challenge_id or challenge.expires_at <= now()
      or challenge.consumed or challenge.attempts >= 3 then
      return '{"allowed":false,"retry_after":60}'::jsonb;
    end if;
    update private.otp_challenges c set attempts = attempts + 1 where c.email_hash = consume_otp_limit.email_hash;
    return '{"allowed":true}'::jsonb;
  end if;
  if challenge.sent_at > now() - interval '60 seconds' then
    return jsonb_build_object('allowed', false, 'retry_after', greatest(1, ceil(extract(epoch from challenge.sent_at + interval '60 seconds' - now()))));
  end if;
  -- IP serialization also protects requests for different accounts from the same IP.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('otp-ip:' || ip_hash, 0));
  foreach rate_key in array array['email:' || email_hash, 'ip:' || ip_hash] loop
    max_requests := case when rate_key like 'email:%' then 5 else 20 end;
    select * into rate from private.auth_rate_limits r where r.key = rate_key;
    if rate.started_at > now() - interval '1 hour' and rate.requests >= max_requests then
      return jsonb_build_object('allowed', false, 'retry_after', greatest(1, ceil(extract(epoch from rate.started_at + interval '1 hour' - now()))));
    end if;
  end loop;
  foreach rate_key in array array['email:' || email_hash, 'ip:' || ip_hash] loop
    insert into private.auth_rate_limits as r (key, started_at, requests) values (rate_key, now(), 1)
    on conflict (key) do update set
      started_at = case when r.started_at <= now() - interval '1 hour' then now() else r.started_at end,
      requests = case when r.started_at <= now() - interval '1 hour' then 1 else r.requests + 1 end;
  end loop;
  insert into private.otp_challenges as c (email_hash, challenge_id, sent_at, expires_at)
    values (email_hash, challenge_id, now(), now() + interval '5 minutes')
    on conflict on constraint otp_challenges_pkey do update set challenge_id = excluded.challenge_id,
      sent_at = excluded.sent_at, expires_at = excluded.expires_at, attempts = 0, consumed = false;
  delete from private.otp_challenges c where c.expires_at < now() - interval '1 day';
  delete from private.auth_rate_limits r where r.started_at < now() - interval '1 day';
  return '{"allowed":true}'::jsonb;
end;
$$;
revoke all on function public.consume_otp_limit(text, text, text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.consume_otp_limit(text, text, text, uuid) to service_role;

create or replace function public.ensure_personal_workspace()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
begin
  -- Serialize first login/retries for this verified account.
  perform 1 from auth.users u where u.id = v_user_id and u.email_confirmed_at is not null for update;
  if not found then
    raise exception using errcode = '42501', message = 'Verified authentication required';
  end if;
  if exists (select 1 from public.profiles p where p.id = v_user_id and p.deleted_at is not null) then
    raise exception using errcode = '42501', message = 'Account unavailable';
  end if;
  insert into public.profiles (id) values (v_user_id) on conflict (id) do nothing;
  if not exists (
    select 1 from public.workspace_members m join public.workspaces w on w.id = m.workspace_id
    where m.user_id = v_user_id and m.role = 'owner'
      and m.status = 'active' and w.type = 'personal'
  ) then
    insert into public.workspaces (name, type, created_by) values ('Personal', 'personal', v_user_id)
      returning id into v_workspace_id;
    insert into public.workspace_members (workspace_id, user_id, role) values (v_workspace_id, v_user_id, 'owner');
  end if;
end;
$$;
revoke all on function public.ensure_personal_workspace() from public, anon, authenticated, service_role;
grant execute on function public.ensure_personal_workspace() to authenticated;

commit;
