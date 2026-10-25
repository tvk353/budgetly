# RLS authorization matrix and test plan

This matrix describes the intended behavior for the current draft. “Allowed” means a direct authenticated SQL/API operation is permitted by grants + RLS, subject to database constraints and validation. It does not imply a full business workflow can be performed without a trusted RPC.

| Resource/action                                     |                                        Active workspace member |                  Removed/non-member | Owner-specific                                                        |
| --------------------------------------------------- | -------------------------------------------------------------: | ----------------------------------: | --------------------------------------------------------------------- |
| Read workspace and active membership roster         |                                                          Allow |                                Deny | Same as member                                                        |
| Create workspace + initial owner                    |                                                       RPC only |                            RPC only | N/A                                                                   |
| Add/remove members or transfer ownership            |                                                       RPC only |                                Deny | Owner-only RPC; transfer requires re-auth                             |
| Read invitations                                    |                                     Allow approved fields only |                                Deny | Never expose `token_hash`; same safe projection as member             |
| Create/revoke/consume invitation                    |                                               Trusted RPC only |                                Deny | Owner/authorized member rules enforced by RPC                         |
| Transactions/refunds                                |            Select/insert and allow-listed updates in workspace |                                Deny | No direct hard delete, reparent, relink, or Trash metadata changes    |
| Budgets                                             |              Select; current-month insert; amount-field update |                                Deny | No direct delete or month/workspace reassignment                      |
| Savings funds/transactions                          |                                     Select/create; fund rename |                                Deny | Delete, restore, and transaction Trash are trusted operations         |
| Trackers/tracker transactions                       |                             Select/create; tracker rename/hide |                                Deny | End/reopen, edit, Trash, restore, purge use trusted operations        |
| Labels                                              |                      Select/create; rename in active workspace |                                Deny | Soft delete/detach is a trusted lifecycle operation                   |
| Hide/show built-in categories                       |                           Owner only, household workspace only |                                Deny | Owner-only                                                            |
| Read built-in categories                            |                                            Authenticated users |              Unauthenticated denied | N/A                                                                   |
| Read custom categories                              | Members of the category scope linked to the selected workspace | Unrelated authenticated user denied | Membership changes do not merge category rows                         |
| Create/mutate custom categories                     |                                   Trusted scope-aware RPC only |               Unrelated user denied | Exact shared-scope mutation authorization must match the API contract |
| Read audit history                                  |                                       Active workspace members |                                Deny | Same as member                                                        |
| Write audit history                                 |                                   Trusted database/server only |                                Deny | Deny direct client writes                                             |
| Read/write background jobs, backup runs, tombstones |                                            Trusted server only |                                Deny | Deny direct client writes                                             |
| Request export                                      |                                         Secure server/RPC flow |                                Deny | Export scope limited to currently authorized workspace                |
| Download export                                     |                      Requester only, after membership re-check |                                Deny | Short-lived signed URL issued by trusted server only                  |
| Account deletion/recovery state changes             |                                        Own request can be read |                                Deny | Trusted server/RPC only                                               |
| Workspace deletion/recovery state changes           |                                       Members can read request |                  Non-members denied | Owner-only RPC; re-auth and confirmation                              |

## Test groups

1. Workspace isolation: user A cannot read, insert, update, or delete user B's workspace data.
2. Removed membership: access stops immediately after membership becomes `removed`, including soft-deleted records.
3. Household parity: two active members can perform ordinary financial operations.
4. Owner boundaries: only owner can change built-in category visibility, remove members, transfer ownership, or delete household workspace.
5. Cross-workspace integrity: a tracker transaction cannot pair workspace X with a tracker in workspace Y.
6. Category scope: built-ins are globally readable to authenticated users; custom reads and trusted writes follow the selected workspace's linked scopes and the approved D1 model.
7. Operational data secrecy: clients cannot read or mutate job queue, backup details, tombstones, or raw export storage paths.
8. Audit integrity: clients cannot forge or modify audit entries.
9. Recovery: restoration requires current authorization and does not reactivate revoked invitations.
10. Concurrency: simultaneous linked refunds cannot exceed the original expense amount; ownership transfer cannot leave zero or two owners.
11. Lifecycle grants: ordinary authenticated users cannot hard-delete financial rows or directly alter protected deletion, actor, workspace, or retention fields.
12. Invitation confidentiality: workspace members cannot select `token_hash`; only approved invitation fields are visible.
13. Budget boundary: direct client insertion of a future-month budget is denied, while current-month creation and past-budget correction follow the API rules.
14. Linked category scope: an active household member can read permitted custom categories from all linked scopes; an unlinked scope and unrelated account remain denied.

## Draft policy status and remaining gates

- Draft removes authenticated hard-delete privileges and narrows updates, but trusted Trash/restore/purge procedures are not implemented here.
- Invitation column grants omit `token_hash`; execute the denial test under `authenticated` before considering this fixed.
- Linked category-scope access is integrated into the helper and mapping-table read policy; direct mapping writes remain trusted. Runtime scope isolation is unverified.
- Current-month budget and parent/detail job checks are present in the draft triggers; exercise boundary, parent-change, missing-detail, and commit behavior.
- Default table/function ACL revokes are set for the role executing the RLS draft; verify every other object-creating role. New public tables still require explicit `ENABLE ROW LEVEL SECURITY` and policies because PostgreSQL does not enable RLS by default.
- The active SQL revokes client/service execution on `shares_active_workspace_with(uuid)`; confirm the function ACL in the test environment.

These are design dispositions, not proof of runtime behavior. Run all role tests against final SQL before approval.

## Labels (planned; not executed)

| Case                                                           | Expected result                    |
| -------------------------------------------------------------- | ---------------------------------- |
| Active workspace member reads labels for their workspace       | Allowed                            |
| Active workspace member creates a label in their workspace     | Allowed subject to name validation |
| User reads or writes labels in unrelated workspace             | Denied                             |
| Transaction references a label from a different workspace      | Rejected by composite foreign key  |
| Same active name repeated case-insensitively in same workspace | Rejected by unique index           |
| Same label name exists in separate workspaces                  | Allowed                            |
