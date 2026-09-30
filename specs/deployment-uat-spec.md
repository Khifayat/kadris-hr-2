# UAT Deployment Specification

## Goal

Provide a repeatable UAT hosting path so testers can access Kadris HR outside the local development machine.

## Current recommendation

Prefer container-based hosting on AWS. App Runner is deprecated for new UAT planning because AWS has announced availability changes for new customers. The repo now supports:

- Docker image packaging.
- ECS/Fargate UAT deployment guide.
- EC2 single-instance UAT deployment guide for simpler manual testing.
- `/api/health` health check endpoint.

## Implemented files

- `Dockerfile`
- `.dockerignore`
- `app/api/health/route.ts`
- `docs/deployment/uat-ecs-fargate.md`
- `docs/deployment/uat-ec2.md`
- `prisma/seed-uat-admin.ts`

## Deployment options

### ECS/Fargate

Recommended for UAT that should resemble production operations. Uses ECR, ECS service, task roles, load balancer, and RDS.

### EC2 single instance

Acceptable for quick UAT. Runs Docker directly on one Amazon Linux EC2 instance. This is easier to understand and debug, but less production-like and requires manual patching/operations.

## Shared requirements

All UAT options need:

- UAT PostgreSQL database.
- Cognito callback/logout URLs for the UAT domain.
- S3 document storage with UAT prefix.
- KMS access if SSE-KMS is used.
- First owner/admin app user seeded in UAT DB.
- `DEV_AUTH_BYPASS=false`.

## Secrets

UAT secrets must not be committed. Store them in either:

- AWS Secrets Manager; or
- EC2 `.env` file with locked-down file permissions for simple UAT.

Secrets include:

- `DATABASE_URL`
- `SESSION_SECRET`
- `COGNITO_CLIENT_SECRET`
- `AWS_SECRET_ACCESS_KEY` if access keys are used

## Verification

After deployment:

- `/api/health` returns `{ ok: true }`.
- Login redirects through Cognito.
- Dashboard loads after sign-in.
- Test document upload lands under `uat/employee-documents` in S3.
- Direct S3 object URL remains private.
