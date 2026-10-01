# Users and Access Management Specification

## Goal

Allow owner/admins to manage app authorization records without manual database edits.

## Implemented files

- `lib/users/schema.ts`
- `lib/users/queries.ts`
- `lib/users/service.ts`
- `app/(protected)/settings/page.tsx`
- `app/(protected)/settings/actions.ts`
- `prisma/migrations/20260930233000_add_user_active/migration.sql`

## Data model

`User` fields used by this feature:

- `authProviderId` — `pending:{uuid}` before first Cognito link or `cognito:{sub}` after login.
- `email` — unique lowercase email used for first Cognito link.
- `name` — display name.
- `role` — app authorization role.
- `active` — whether user can authenticate into the app.
- `employeeId` — optional one-to-one employee profile link.

## Owner/admin UI

The Users & Access panel appears on `/settings` only for `OWNER_ADMIN` users.

Capabilities:

- Add app user.
- Edit name, email, role, and employee profile link.
- View active/inactive status.
- View Cognito linked/pending login status.
- Deactivate user.
- Reactivate user.

## Safeguards

- Current user cannot deactivate their own account.
- The system prevents deactivating or demoting the last active owner/admin.
- Employee profile can only be linked to one user.
- User mutations require `OWNER_ADMIN`.

## Cognito linking behavior

Creating an employee also creates or links an app user. By default, the app calls Cognito `AdminCreateUser`, which sends first-login instructions by email. The employee profile supports retrying or resending the invitation. When Cognito returns a subject, the app stores `cognito:{sub}` immediately; `/auth/callback` can still link a pending user by matching email.

Required deployment configuration:

- `COGNITO_USER_POOL_ID`
- `AWS_REGION`
- workload credentials with least-privilege Cognito admin permissions

## Audit logs

Actions emit audit records:

- `USER_CREATED`
- `USER_UPDATED`
- `USER_DEACTIVATED`
- `USER_REACTIVATED`
- `USER_INVITED`
- `USER_LINKED_TO_EMPLOYEE`
