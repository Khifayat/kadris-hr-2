# Authentication and Authorization Specification

## Goal

Authenticate users through AWS Cognito and authorize them through app-owned role and user records.

## Implemented files

- `lib/auth/cognito.ts`
- `lib/auth/session.ts`
- `app/login/page.tsx`
- `app/auth/login/route.ts`
- `app/auth/callback/route.ts`
- `app/auth/logout/route.ts`
- `components/app-shell.tsx`
- `lib/permissions/roles.ts`

## Cognito flow

1. User visits `/login`.
2. User clicks Cognito sign-in.
3. `/auth/login` generates state, nonce, PKCE verifier/challenge, stores temporary cookies, and redirects to Cognito Hosted UI.
4. Cognito returns to `/auth/callback` with an authorization code.
5. App validates state, exchanges code for tokens, verifies ID token using Cognito JWKS, and extracts Cognito subject/email.
6. App finds an active user by `authProviderId = cognito:{sub}` or links an existing active app user by exact lowercase email.
7. App sets signed session cookie and redirects to `/dashboard`.

## App session

The app session is an HMAC-signed cookie. Passwords are never stored by the app. Cognito secrets and tokens must not be logged.

## Authorization rules

## Local development access

Local development can use an explicit Cognito-free path only when both conditions are true:

- `NODE_ENV` is not `production`.
- `DEV_AUTH_BYPASS` is exactly `true`.

In that mode, the app resolves the first active `OWNER_ADMIN` record from the local database and the login page offers an **Open dashboard** action. This path is for local testing only. It must never be enabled in UAT or production, and it must not create, persist, or expose Cognito tokens.

- `DEV_AUTH_BYPASS` is only accepted outside production and only when explicitly set to `true`.
- In normal mode, no app user means no access.
- Inactive app users are blocked.
- Protected pages use `requireUser()`.
- Role-protected areas use `requireRole()`.

## Role permissions

- `OWNER_ADMIN`, `ADMIN`, `HR_ADMIN`: HR write access.
- `OWNER_ADMIN`, `ADMIN`, `HR_ADMIN`, `MANAGER`: HR read workspace access.
- `EMPLOYEE`: own self-service and reminders access.

`ADMIN` is a secondary application-administrator role. It can manage Users & Access and the operational workspace, but cannot create, edit, promote, deactivate, or reactivate an `OWNER_ADMIN` account. `OWNER_ADMIN` remains the account-ownership role.

## First-access tutorial

Each user is shown a short first-access tutorial until they complete it. The completion timestamp is stored in `User.tutorialCompletedAt`, so the tutorial does not reappear on later devices or sessions. It introduces the dashboard or task workspace, employee/task handling, and the relevant administration or reminder area for the user’s role. Completion records a `FIRST_ACCESS_TUTORIAL_COMPLETED` audit event.

The profile page includes a **View tutorial** action that clears the signed-in user’s completion timestamp and returns them to the dashboard with the walkthrough available again.

## Navigation behavior

Navigation is filtered by role in `AppShell`, but this is convenience only. Server checks remain authoritative.

The sidebar provides sign-out at its bottom on desktop layouts. The same sign-out action is available from `/profile`.

## Failure states

- Missing Cognito config: login page can render but auth cannot proceed.
- Cognito error: redirect to `/login?error=...`.
- Unknown/unauthorized app user: redirect to `/unauthorized`.
- Token/state/verification failure: clear auth cookies and redirect to `/login?error=auth_failed`.
