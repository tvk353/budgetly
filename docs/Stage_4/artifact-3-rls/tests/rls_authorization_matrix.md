# RLS authorization matrix and test plan

This matrix describes the intended behavior for the current draft. “Allowed” means a direct authenticated SQL/API operation is permitted by grants + RLS, subject to database constraints and validation. It does not imply a full business workflow can be performed without a trusted RPC.

| Resource/action                                     |                                  Active workspace member |                               Removed/non-member | Owner-specific                                         |
| --------------------------------------------------- | -------------------------------------------------------: | -----------------------------------------------: | ------------------------------------------------------ |
| Read workspace and active membership roster         |                                                    Allow |                                             Deny | Same as member                                         |
| Create workspace + initial owner                    |                                                 RPC only |                                         RPC only | N/A                                                    |
| Add/remove members or transfer ownership            |                                                 RPC only |                                             Deny | Owner-only RPC; transfer requires re-auth              |
| Read invitations                                    |                                        Allow for members |                                             Deny | Same as member                                         |
| Create/revoke/consume invitation                    |                                         Trusted RPC only |                                             Deny | Owner/authorized member rules enforced by RPC          |
| Read/write transactions and refunds                 |                                       Allow in workspace |                                             Deny | No elevated financial permission                       |
| Read/write budgets                                  |                                       Allow in workspace |                                             Deny | No elevated financial permission                       |
| Read/write savings funds and transactions           |                                       Allow in workspace |                                             Deny | No elevated financial permission                       |
| Read/write trackers and tracker transactions        |                                       Allow in workspace |                                             Deny | No elevated financial permission                       |
| Hide/show built-in categories                       |                     Owner only, household workspace only |                                             Deny | Owner-only                                             |
| Read global categories                              |                                      Authenticated users |                           Unauthenticated denied | N/A                                                    |
| Create custom global category                       |                               Authenticated creator only |                           Unauthenticated denied | N/A                                                    |
| Rename/archive/restore/delete custom category       | Creator or user sharing an active workspace with creator | Unrelated authenticated user denied for mutation | Shared workspace does not grant built-in mutation      |
| Read audit history                                  |                                 Active workspace members |                                             Deny | Same as member                                         |
| Write audit history                                 |                             Trusted database/server only |                                             Deny | Deny direct client writes                              |
| Read/write background jobs, backup runs, tombstones |                                      Trusted server only |                                             Deny | Deny direct client writes                              |
| Request export                                      |                                   Secure server/RPC flow |                                             Deny | Export scope limited to currently authorized workspace |
| Download export                                     |                Requester only, after membership re-check |                                             Deny | Short-lived signed URL issued by trusted server only   |
| Account deletion/recovery state changes             |                                  Own request can be read |                                             Deny | Trusted server/RPC only                                |
| Workspace deletion/recovery state changes           |                                 Members can read request |                               Non-members denied | Owner-only RPC; re-auth and confirmation               |

## Test groups

1. Workspace isolation: user A cannot read, insert, update, or delete user B's workspace data.
2. Removed membership: access stops immediately after membership becomes `removed`, including soft-deleted records.
3. Household parity: two active members can perform ordinary financial operations.
4. Owner boundaries: only owner can change built-in category visibility, remove members, transfer ownership, or delete household workspace.
5. Cross-workspace integrity: a tracker transaction cannot pair workspace X with a tracker in workspace Y.
6. Global categories: category read scope and custom mutation scope match the approved category model.
7. Operational data secrecy: clients cannot read or mutate job queue, backup details, tombstones, or raw export storage paths.
8. Audit integrity: clients cannot forge or modify audit entries.
9. Recovery: restoration requires current authorization and does not reactivate revoked invitations.
10. Concurrency: simultaneous linked refunds cannot exceed the original expense amount; ownership transfer cannot leave zero or two owners.

## Labels (planned; not executed)

| Case                                                           | Expected result                    |
| -------------------------------------------------------------- | ---------------------------------- |
| Active workspace member reads labels for their workspace       | Allowed                            |
| Active workspace member creates a label in their workspace     | Allowed subject to name validation |
| User reads or writes labels in unrelated workspace             | Denied                             |
| Transaction references a label from a different workspace      | Rejected by composite foreign key  |
| Same active name repeated case-insensitively in same workspace | Rejected by unique index           |
| Same label name exists in separate workspaces                  | Allowed                            |
