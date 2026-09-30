# Kadris HR Master Specification

## Purpose

Kadris HR is an internal HR and compliance management app for Kadris Support Services. It centralizes employee onboarding, compliance requirements, document evidence, clearance-to-work status, reminders, and app-level access management.

## Current version scope

This version includes:

- AWS Cognito Hosted UI authentication.
- App-level role authorization.
- Owner/admin user management.
- Employee directory and employee profile management.
- Configurable job roles and compliance requirements.
- Employee requirement assignment and clearance calculation.
- HR document upload, approval, rejection, and protected download.
- Private S3 document storage with optional KMS encryption.
- Employee self-service requirements page.
- Compliance and reminder queues.
- Dashboard summary metrics.
- Audit log persistence for major HR/admin actions.

## Primary personas

- Owner Admin: full app administration, settings, user/access management, employee and compliance operations.
- HR Admin: HR/compliance operations and configuration, except owner-only user/access controls.
- Manager: HR workspace read access where permitted by app role rules.
- Employee: self-service access to their own requirements and documents.

## Authorization model

Cognito authenticates identity. The application database authorizes access. A Cognito account must match an active app `User` record by provider ID or email before access is granted.

Roles:

- `OWNER_ADMIN`
- `HR_ADMIN`
- `MANAGER`
- `EMPLOYEE`

Core rule: never treat navigation visibility as authorization. Protected pages and actions must enforce server-side role checks.

## Major routes

- `/login` — app sign-in entry point.
- `/auth/login` — starts Cognito OAuth flow.
- `/auth/callback` — validates Cognito response and creates app session.
- `/auth/logout` — clears app session and redirects through Cognito logout.
- `/dashboard` — HR summary dashboard.
- `/employees` — employee directory.
- `/employees/new` — create employee.
- `/employees/[id]` — employee profile, checklist, upload/review actions.
- `/documents/[id]` — authorized document download proxy.
- `/compliance` — pending/expired/expiring compliance queue.
- `/my-requirements` — employee self-service portal.
- `/reminders` — reminder inbox.
- `/settings` — job role, requirement, and owner-only users/access configuration.
- `/unauthorized` — restricted access page.

## Data model overview

Primary models:

- `User` — app authorization record and Cognito linkage.
- `Employee` — employment profile and clearance projection.
- `JobRole` — configurable role template.
- `Requirement` — reusable compliance requirement.
- `JobRoleRequirement` — role-to-requirement rule.
- `EmployeeRequirement` — employee-specific requirement assignment snapshot.
- `Document` — uploaded evidence metadata and private storage key.
- `ClearanceEvent` — clearance state transitions.
- `AuditLog` — persisted administrative and HR actions.

## Storage model

Documents are not stored as public URLs. The `Document.storageKey` points to either local development storage or a private S3 key. Downloads go through `/documents/[id]`, which checks app authorization before reading the object.

## Environment dependencies

Required for normal local operation:

- PostgreSQL database.
- Cognito User Pool and hosted UI settings.
- `SESSION_SECRET`.

Required for S3 document storage:

- `DOCUMENT_STORAGE_PROVIDER="s3"`
- `AWS_REGION`
- `S3_DOCUMENT_BUCKET`
- `S3_DOCUMENT_PREFIX`
- AWS credentials or workload role with least-privilege S3 access.
- `S3_DOCUMENT_KMS_KEY_ID` when SSE-KMS is used.

## Verification baseline

Before shipping changes, run:

```bash
pnpm test
pnpm run typecheck
pnpm run lint
pnpm exec next build --webpack
```

The app currently uses Next.js 16. Prefer local docs under `node_modules/next/dist/docs/` before changing route handlers, pages, middleware/proxy, or server actions.

## Feature specs

- [Authentication and Authorization](./auth-access-spec.md)
- [Users and Access Management](./users-access-spec.md)
- [Employee Management](./employee-management-spec.md)
- [Compliance Engine](./compliance-engine-spec.md)
- [Document Storage and Review](./document-storage-spec.md)
- [Settings and Rule Configuration](./settings-rules-spec.md)
- [Employee Self-Service](./self-service-spec.md)
- [Reminders](./reminders-spec.md)
- [Dashboard](./dashboard-spec.md)
- [Data and Security](./data-security-spec.md)
- [UAT Deployment](./deployment-uat-spec.md)
