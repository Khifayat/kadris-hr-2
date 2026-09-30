# UAT Deployment: Amazon ECS on Fargate

This is the recommended UAT path for Kadris HR. App Runner is no longer the preferred option because AWS has announced App Runner will stop accepting new customers after April 30, 2026 and will not receive new features.

## Target architecture

```text
GitHub repo
  ↓
Docker image build
  ↓
Amazon ECR
  ↓
Amazon ECS service on Fargate
  ↓
Application Load Balancer
  ↓
RDS PostgreSQL + Cognito + S3/KMS
```

## 1. Create an ECR repository

AWS Console → ECR → Create repository.

Suggested name:

```text
kadris-hr
```

After creation, copy the repository URI. It will look like:

```text
445567071188.dkr.ecr.us-east-2.amazonaws.com/kadris-hr
```

## 2. Build and push the image

From the project root:

```bash
aws ecr get-login-password --region us-east-2   | docker login --username AWS --password-stdin 445567071188.dkr.ecr.us-east-2.amazonaws.com

docker build -t kadris-hr:uat .
docker tag kadris-hr:uat 445567071188.dkr.ecr.us-east-2.amazonaws.com/kadris-hr:uat
docker push 445567071188.dkr.ecr.us-east-2.amazonaws.com/kadris-hr:uat
```

## 3. Create the UAT RDS PostgreSQL database

Use RDS PostgreSQL for UAT.

Suggested identifier:

```text
kadris-hr-uat
```

For quick UAT, public access is acceptable temporarily if security groups restrict who can connect. Longer term, use private subnets and ECS networking.

The app database URL should look like:

```env
DATABASE_URL=postgresql://USER:PASSWORD@RDS_ENDPOINT:5432/postgres?schema=public
```

## 4. Store secrets in Secrets Manager

Suggested secret name:

```text
kadris-hr/uat/app
```

Secret values:

```env
DATABASE_URL=postgresql://...
SESSION_SECRET=...
COGNITO_CLIENT_SECRET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Later, replace AWS access keys with an ECS task role.

## 5. Create ECS cluster

AWS Console → ECS → Create cluster.

Suggested name:

```text
kadris-hr-uat
```

Use Fargate/serverless infrastructure.

## 6. Create task execution role and task role

Execution role needs standard ECS task execution permissions to pull from ECR and write logs.

Task role should allow:

- S3 `GetObject` / `PutObject` on the UAT prefix
- KMS encrypt/decrypt/data key on the KMS key if using SSE-KMS
- Secrets Manager read for the app secret, if injecting secrets through ECS

S3 scope:

```text
arn:aws:s3:::kadris-hr-documents-445567071188/uat/employee-documents/*
```

KMS scope:

```text
arn:aws:kms:us-east-2:445567071188:key/ec6235a7-d3e5-4a63-98c3-00b531fa285d
```

## 7. Create ECS task definition

Launch type: Fargate.

Container:

```text
name: kadris-hr
image: 445567071188.dkr.ecr.us-east-2.amazonaws.com/kadris-hr:uat
port: 3000
```

Environment variables:

```env
NODE_ENV=production
DEV_AUTH_BYPASS=false
APP_BASE_URL=https://YOUR-UAT-DOMAIN
AWS_REGION=us-east-2
DOCUMENT_STORAGE_PROVIDER=s3
S3_DOCUMENT_BUCKET=kadris-hr-documents-445567071188
S3_DOCUMENT_PREFIX=uat/employee-documents
S3_DOCUMENT_KMS_KEY_ID=ec6235a7-d3e5-4a63-98c3-00b531fa285d
COGNITO_ISSUER=https://cognito-idp.us-east-2.amazonaws.com/us-east-2_qd744O2J6
COGNITO_DOMAIN=https://us-east-2qd744o2j6.auth.us-east-2.amazoncognito.com
COGNITO_CLIENT_ID=1h3hfa3q1cqa9kdmb7s875a8v1
```

Secrets from Secrets Manager:

```env
DATABASE_URL
SESSION_SECRET
COGNITO_CLIENT_SECRET
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

Health check path:

```text
/api/health
```

## 8. Run migrations

Before first traffic, run migrations against UAT:

```bash
DATABASE_URL="postgresql://..." pnpm exec prisma migrate deploy
```

Options:

- run from local machine with UAT database access;
- run a one-off ECS task command;
- add CI/CD migration step later.

## 9. Seed first UAT admin

With UAT env vars loaded:

```bash
UAT_ADMIN_EMAIL=abolurinkhifayat1@gmail.com UAT_ADMIN_NAME="Khifayat Abolurin" pnpm run db:seed:uat-admin
```

This creates an active owner/admin app user. First Cognito login links it.

## 10. Create ECS service with load balancer

Create an ECS service from the task definition.

- Desired tasks: 1 for UAT.
- Public Application Load Balancer.
- Listener: HTTP 80 initially, HTTPS later with ACM certificate.
- Target group protocol: HTTP.
- Target group port: 3000.
- Health path: `/api/health`.

After service is healthy, copy the load balancer DNS name.

## 11. Update Cognito URLs

Add callback URL:

```text
https://YOUR-UAT-DOMAIN/auth/callback
```

Add sign-out URL:

```text
https://YOUR-UAT-DOMAIN/login
```

Keep local URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3000/login
```

## 12. Smoke test

- Open UAT URL.
- Sign in through Cognito.
- Confirm dashboard loads.
- Create a test user in Settings.
- Upload a test document.
- Confirm S3 object appears under `uat/employee-documents`.
- Confirm direct S3 object URL is not public.
