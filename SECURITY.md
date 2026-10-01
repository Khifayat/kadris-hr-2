# Kadris HR Security Baseline

This app is intended to store HR PII and compliance documents. Production deployments should use the following baseline before real employee data is uploaded.

## Authentication

- Use Amazon Cognito User Pools with Hosted UI or an OIDC-compatible Cognito flow.
- Configure the callback URL as `/auth/callback` and the logout URL as `/login`.
- Require MFA for HR/admin accounts.
- Use a strong app `SESSION_SECRET`; rotate it if exposed.
- Keep `DEV_AUTH_BYPASS=false` in every non-local environment.
- Grant the workload only the Cognito administrative actions needed to create, inspect, enable, disable, and resend invitations for users in the configured pool.

## Authorization

- Cognito authenticates the person; the app database authorizes what they can do.
- App roles are `OWNER_ADMIN`, `HR_ADMIN`, `MANAGER`, and `EMPLOYEE`.
- Employees may only access their own profile documents.
- HR/admin-only pages must call `requireRole()` server-side.
- Never trust navigation visibility as authorization; it is only convenience.

## Documents

- Use `DOCUMENT_STORAGE_PROVIDER="s3"` with a private S3 bucket for production document storage.
- Block all public S3 access.
- Encrypt objects at rest. The app uses S3-managed encryption by default and switches to SSE-KMS when `S3_DOCUMENT_KMS_KEY_ID` is configured.
- Serve downloads only after app authorization checks.
- Do not expose raw S3 object keys to users when avoidable.

## Database

- Use Amazon RDS PostgreSQL with encryption at rest enabled.
- Require TLS in transit.
- Keep the database in a private subnet.
- Store credentials in AWS Secrets Manager or SSM Parameter Store.

## AWS IAM

- Use least-privilege IAM roles for the app workload.
- Grant only the specific S3, KMS, Secrets Manager, and logging actions required.
- Enable CloudTrail and review access regularly.

## Logging

- Keep app-level audit logs for HR actions.
- Do not log uploaded document contents, ID tokens, access tokens, session cookies, or secrets.
