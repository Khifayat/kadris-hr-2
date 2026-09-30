# UAT Deployment: AWS App Runner

This guide deploys Kadris HR as a UAT environment using AWS App Runner, RDS PostgreSQL, Cognito, S3, and KMS.

## 1. Prerequisites

- Private GitHub repository connected to App Runner.
- UAT RDS PostgreSQL database.
- Cognito user pool and app client.
- Private S3 bucket for documents.
- KMS key if using SSE-KMS.
- Secrets Manager secret for sensitive values.

## 2. App Runner source

Use this repository as the App Runner source.

Recommended branch: `main`

The repo includes `apprunner.yaml`, which App Runner can use for build/run settings.

## 3. Required non-secret environment variables

Set these directly in App Runner:

```env
NODE_ENV=production
DEV_AUTH_BYPASS=false
APP_BASE_URL=https://YOUR-UAT-APP-RUNNER-URL
AWS_REGION=us-east-2
DOCUMENT_STORAGE_PROVIDER=s3
S3_DOCUMENT_BUCKET=kadris-hr-documents-445567071188
S3_DOCUMENT_PREFIX=uat/employee-documents
S3_DOCUMENT_KMS_KEY_ID=ec6235a7-d3e5-4a63-98c3-00b531fa285d
COGNITO_ISSUER=https://cognito-idp.us-east-2.amazonaws.com/us-east-2_qd744O2J6
COGNITO_DOMAIN=https://us-east-2qd744o2j6.auth.us-east-2.amazoncognito.com
COGNITO_CLIENT_ID=1h3hfa3q1cqa9kdmb7s875a8v1
```

## 4. Required secret environment variables

Store these in Secrets Manager and reference them from App Runner:

```env
DATABASE_URL=postgresql://...
SESSION_SECRET=...
COGNITO_CLIENT_SECRET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

For a more production-like setup, replace AWS access keys with an App Runner instance role.

## 5. Build and start

The App Runner config runs:

```bash
pnpm install --frozen-lockfile
pnpm run deploy:build
pnpm start
```

`deploy:build` runs Prisma generation, migrations, and a webpack Next build.

## 6. Cognito callback URLs

After App Runner creates the UAT URL, add these to the Cognito app client:

```text
https://YOUR-UAT-APP-RUNNER-URL/auth/callback
https://YOUR-UAT-APP-RUNNER-URL/login
```

Keep local development URLs too:

```text
http://localhost:3000/auth/callback
http://localhost:3000/login
```

## 7. Seed first UAT admin

After the first deployment/migration, run this against the UAT database with the UAT env vars loaded:

```bash
UAT_ADMIN_EMAIL=abolurinkhifayat1@gmail.com UAT_ADMIN_NAME="Khifayat Abolurin" pnpm run db:seed:uat-admin
```

This creates or updates the owner/admin authorization record. The first Cognito login with that email will link the Cognito subject.

## 8. Document storage separation

UAT should use this prefix:

```env
S3_DOCUMENT_PREFIX=uat/employee-documents
```

Production should use a separate prefix or bucket.

## 9. Smoke test

- Open UAT URL.
- Sign in through Cognito.
- Confirm dashboard loads.
- Add a test user in Settings.
- Upload a test document to an employee requirement.
- Confirm object appears under the UAT S3 prefix.
- Confirm direct public object URL is denied.
