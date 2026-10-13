Stage 2 — Product Requirements Document (PRD)
Status: Approved
Project: Personal Expense Tracker
The PRD defines what the application must do from the user's point of view.
1. Accounts and workspaces
- Two users authenticate using email OTP.
- Login persists until logout, session revocation, or a security event.
- Each user has a private Personal workspace.
- Both users can access the Shared Household workspace.
- The default workspace after login is Shared Household.
- Users can switch to their own Personal workspace.
- Household members have equal permissions for ordinary household finance operations.
- Only the household owner can remove another member.
- Ownership can be transferred with confirmation and re-authentication.
- Invitations expire after seven days and can be revoked.
- Workspace deletion immediately revokes invitations.
2. Expenses and refunds
- Every transaction has a positive amount, date, and category.
- Currency is INR, with up to two decimal places.
- Transaction dates cannot be in the future, using the Asia/Kolkata timezone.
- Description is optional, maximum 50 characters.
- Notes are optional, maximum 500 characters.
- Refunds can be linked to an original expense or entered as unlinked refunds.
- Multiple partial refunds are allowed, but linked refunds cannot exceed the remaining refundable amount.
- A linked refund initially inherits the original expense category.
- Deleting an expense moves it and all linked refunds to Trash together.
- Deleting a linked refund does not change the original expense amount.
- Possible duplicates generate a warning but can still be saved.
- Historical transactions can be edited.
- Concurrent edits use last successful save wins, with audit history.
3. Monthly budgets
- At most one budget per workspace per calendar month.
- A new budget can be created only for the current month.
- Past budgets and rollover values can be edited for corrections.
- Rollover must be zero or positive.
- Applicable Budget = Base Budget + Rollover
- Net Eligible Expenses = Expenses − Refunds
- Available Budget = Applicable Budget − Net Eligible Expenses
- Available budget may be negative; overspending is allowed and shown clearly.
4. Savings
- Savings funds and transactions are independent of budgets and trackers.
- Fund names are required, trimmed, 1–50 characters, and unique case-insensitively within a workspace.
- Transactions are deposits or withdrawals.
- Amounts are positive, and dates cannot be in the future.
- Balance = Deposits − Withdrawals
- Negative balances are allowed.
- Soft-deleting a fund hides it from normal views but retains its transactions and balance until permanent deletion.
- Restoring a fund restores its retained transactions.
- Permanent deletion after confirmation deletes the fund and its transactions.
5. Trackers
- Users can create trackers for subjects such as travel, education, renovation, or maternity.
- Trackers do not require a starting budget or dates.
- Tracker transactions support expenses and refunds.
- Trackers are independent of budgets and savings.
- Trackers remain active until manually ended.
- Ended trackers are read-only until reopened.
- Hidden trackers are omitted from normal dashboards, lists, and reports. Users must explicitly open a hidden tracker to access its history.
- Deleting a tracker moves it and its transactions/refunds to Trash together.
- Tracker reports show gross expenses, refunds, and net spending.
6. Categories
- Ordinary expense categories and tracker categories are separate types.
- Each type has built-in and globally shared custom categories.
- Custom names are globally unique case-insensitively after trimming spaces, with a maximum of 30 characters.
- Optional description up to 200 characters, user-selected color, and optional predefined icon.
- Custom names cannot conflict with built-in names.
- Built-in categories cannot be renamed or permanently deleted by users.
- The household owner controls built-in category visibility in Shared Household only.
- Custom categories can be created, renamed, archived, and restored.
- Archived categories cannot be selected for new transactions but remain linked to historical records.
- Category definitions are global; financial records remain private to their workspace.
7. Trash, deletion, and recovery
- Soft-deleted records remain in Trash for 30 days.
- Users may permanently delete items earlier after confirmation.
- Items in Trash must be restored before editing.
- Restoring a record recalculates totals.
- Permanent deletion also removes associated audit entries.
- Workspace deletion has three confirmation steps and a 30-day recovery period.
- Restoration is limited to currently authorized household members.
- Account deletion disables sign-in immediately and starts a 30-day recovery period.
- Shared household records remain available to the other authorized member.
- Encrypted backups may retain copies until their 90-day retention expires, but restore must not resurrect permanently deleted workspaces.
8. Audit history
- Record who changed a financial record, what changed, and when.
- Audit category creation, rename, archive, restore, and permanent deletion.
- Retain audit history for one year, except entries belonging to permanently deleted financial records are also deleted.
- Retained shared history identifies a permanently deleted user as Deleted user.
9. Exports and backups
- Users can export active records from one selected workspace at a time.
- Support custom date ranges and predefined periods.
- Download each CSV separately.
- Filenames include workspace, data type, and export date.
- Every January, export the previous calendar year's authorized data.
- Save annual CSVs in a designated Google Drive folder organized by year.
- Email each authorized user a link to their own accessible export.
- Require sign-in and authorization to download.
- Keep annual exports in Drive until the user deletes them.
- Show export status and support retries.
- Target 90-day independent encrypted backup retention, 24-hour RPO, and 8-hour RTO. These are objectives, not free-tier guarantees.
10. Security
- Server-side authorization and PostgreSQL Row Level Security (RLS).
- OTP expiry after five minutes, single use, maximum three attempts.
- 60-second OTP resend cooldown and rate limits per account and IP.
- Configurable rate limits for authentication, invitations, and write endpoints.
- Revoke sessions on logout-all-devices, account deletion, removal from a workspace, or a security event.
Out of scope for the first version
Bank integrations, automatic detection, OCR, offline entry, account balances, transaction attachments, mandatory category budgets, and spending alerts.