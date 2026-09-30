# Data and Security Specification

## Goal

Document the app’s security posture for HR PII, compliance documents, authentication, authorization, and auditability.

## Current controls

- Cognito Hosted UI authentication.
- App-owned authorization records and roles.
- Active/inactive app user enforcement.
- Server-side role checks for protected actions/pages.
- Private S3 document storage option.
- KMS support for S3 encryption.
- Document download proxy with app authorization checks.
- Audit logs for major HR/admin actions.
- No app-stored passwords.
- `.env` ignored by git.

## Sensitive data

Sensitive data includes:

- employee identity/contact details;
- employment and job role details;
- compliance requirement statuses;
- uploaded compliance documents;
- Cognito identifiers;
- AWS credentials and secrets.

## Database

Local development uses PostgreSQL. Production should use managed PostgreSQL such as RDS with encryption at rest, TLS, private networking, and secrets stored in AWS Secrets Manager or SSM Parameter Store.

## S3

Production S3 requirements:

- block public access;
- bucket/object encryption enabled;
- SSE-KMS preferred for HR PII;
- least-privilege IAM access to the configured prefix;
- no public object URLs in the app.

## IAM

The app should have only the permissions it needs:

- `s3:PutObject`
- `s3:GetObject`
- KMS encrypt/decrypt/data-key actions if SSE-KMS is enabled

Scope S3 access to the document prefix, not the whole AWS account.

## Logging

Do not log:

- document contents;
- ID/access tokens;
- session cookies;
- AWS secret keys;
- Cognito client secret;
- raw passwords or temporary passwords.

Audit logs should track business actions, not secret material.

## Production hardening backlog

- Require MFA for HR/admin Cognito users.
- Move database to private managed infrastructure.
- Move AWS credentials to workload roles or secrets manager.
- Add audit log UI.
- Add backup/retention policy.
- Add malware scanning pipeline for uploaded files if required by compliance policy.
- Add operational monitoring and alerting.
