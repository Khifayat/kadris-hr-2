# Document Storage and Review Specification

## Goal

Allow authorized users to upload compliance evidence, store it privately, and review it before it contributes to clearance.

## Implemented files

- `lib/documents/service.ts`
- `lib/documents/storage.ts`
- `app/(protected)/documents/[id]/route.ts`
- `app/(protected)/employees/[id]/actions.ts`
- `app/(protected)/my-requirements/actions.ts`

## Upload validation

Accepted file types:

- PDF
- JPEG
- PNG
- WebP
- plain text

Maximum size: 10 MB.

## Storage providers

The app supports:

- local development storage under `storage/employee-documents`
- private S3 storage when `DOCUMENT_STORAGE_PROVIDER="s3"`

Required S3 env vars:

- `AWS_REGION`
- `S3_DOCUMENT_BUCKET`
- `S3_DOCUMENT_PREFIX`

Optional KMS env var:

- `S3_DOCUMENT_KMS_KEY_ID`

## S3 key convention

New uploads use this key shape:

```text
{prefix}/{employee-number}/{requirement-name}/{yyyy}/{mm}/{dd}/{random-id}-{original-file-name}
```

Example:

```text
employee-documents/kss-1002/cpr/2026/09/30/uuid-cpr-card.pdf
```

Full employee names are intentionally not included in object keys to reduce PII exposure in logs and console paths.

## Review workflow

1. User uploads a document for an employee requirement.
2. Requirement status becomes `PENDING_REVIEW`.
3. HR/admin approves or rejects.
4. Approval updates status to `APPROVED` and may affect clearance.
5. Rejection updates status to `REJECTED` with reason and blocks clearance until corrected.

## Download flow

Documents are downloaded through `/documents/[id]`. The route:

- requires an authenticated user;
- finds the active document metadata;
- checks HR read access or employee self-access;
- reads the private object; and
- returns it as an attachment.

Raw S3 object URLs are not exposed to users.
