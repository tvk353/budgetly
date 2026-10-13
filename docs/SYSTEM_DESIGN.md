Stage 3 — System Design Architecture
Status: Approved
Project: Personal Expense Tracker
This stage defines the main technologies and how the parts of the app work together. It is a system blueprint, not the detailed database schema or application code.
Proposed technology stack

- Frontend and application server: Next.js + TypeScript, organized as a modular monolith.
- Database: Supabase PostgreSQL.
- Authentication: Supabase email OTP, subject to provider feasibility checks.
- Database security: PostgreSQL Row Level Security (RLS) plus server-side authorization.
- Hosting: Vercel Hobby, subject to current plan limits.
- Annual CSV exports: Google Drive.
- Client: Responsive web app installable as a PWA on iPhone.
  High-level architecture

1. The user opens the web app on iPhone or desktop.
2. Next.js renders the interface and handles application API requests.
3. The server verifies the user's authentication and workspace permissions.
4. PostgreSQL stores the authoritative financial data.
5. RLS provides a second layer of database access control.
6. Export and cleanup jobs run on a schedule where supported.
7. Export jobs write authorized CSV files to the configured Google Drive destination and notify the appropriate user.
8. Independent encrypted backups provide a recovery path beyond annual CSV exports.
   Architectural principles

- Online-only initially; no offline transaction entry or sync.
- PostgreSQL is the source of truth.
- Shared records are stored once in the Shared Household workspace.
- Personal workspace data remains private.
- Use live updates where supported, with refresh fallback.
- Background jobs need status tracking, retries, idempotence, and failure notifications.
- Secrets must remain on the server and never be exposed to the browser.
- Financial amounts must use exact decimal storage.
  Free-tier constraints and recovery
- Target recurring cost is ₹0, but free-tier pricing, quotas, and availability must be checked before implementation and release.
- Supabase Free may pause projects after inactivity; manual resumption is accepted.
- Supabase Free does not provide managed database backups, so independent backups are required.
- A PostgreSQL dump may not include every managed authentication/configuration detail. Recovery instructions must cover how to recreate provider settings and secrets.
- Vercel Hobby cron jobs are not guaranteed to execute at an exact time. Jobs must detect missed runs and retry safely.
- Supabase's default email delivery is limited for production OTP usage; a suitable SMTP provider must be selected.
- An independent backup destination and production SMTP provider remain feasibility items to verify before release.
  Recovery objectives
- Independent encrypted backups.
- Backup retention target: 90 days.
- Recovery Point Objective (RPO): 24 hours.
- Recovery Time Objective (RTO): 8 hours.
- These are objectives, not guarantees from free-tier providers.
- Test restoration regularly.
- Reconcile permanent-deletion markers before recovered data becomes available.
  Why this stage exists
  Stage 3 decides which technologies will be used and how the application components interact. Stage 4 turns the product rules into concrete database entities, constraints, permissions, and API contracts.
