# UAT Deployment: Single EC2 Instance

This guide hosts Kadris HR for UAT on one Amazon Linux 2023 EC2 instance running Docker.

Use this for quick external testing. For a more production-like UAT environment, prefer ECS/Fargate.

## 1. Create ECR repository

AWS Console → ECR → Repositories → Create repository.

Name:

```text
kadris-hr
```

Repository URI example:

```text
445567071188.dkr.ecr.us-east-2.amazonaws.com/kadris-hr
```

## 2. Build and push Docker image from your Mac

From the project folder:

```bash
cd "/Users/khifayatabolurin/Desktop/Kadris HR"

aws ecr get-login-password --region us-east-2   | docker login --username AWS --password-stdin 445567071188.dkr.ecr.us-east-2.amazonaws.com

docker build -t kadris-hr:uat .
docker tag kadris-hr:uat 445567071188.dkr.ecr.us-east-2.amazonaws.com/kadris-hr:uat
docker push 445567071188.dkr.ecr.us-east-2.amazonaws.com/kadris-hr:uat
```

## 3. Create UAT RDS PostgreSQL

AWS Console → RDS → Create database.

Recommended:

- Engine: PostgreSQL
- Template: Dev/Test
- Identifier: `kadris-hr-uat`
- Public access: yes for simple UAT, but restrict security group access
- Database name can remain `postgres` initially

Copy endpoint, username, password, and port.

UAT `DATABASE_URL` shape:

```env
DATABASE_URL=postgresql://USER:PASSWORD@RDS_ENDPOINT:5432/postgres?schema=public
```

## 4. Create EC2 IAM role

AWS Console → IAM → Roles → Create role.

Trusted entity: AWS service → EC2.

Attach permissions for:

- Pulling from ECR
- Reading/writing app documents in S3
- KMS encrypt/decrypt/data key if using SSE-KMS

For quick UAT, you can attach AWS managed `AmazonEC2ContainerRegistryReadOnly`, then add an inline policy for S3/KMS.

S3 resource:

```text
arn:aws:s3:::kadris-hr-documents-445567071188/uat/employee-documents/*
```

KMS resource:

```text
arn:aws:kms:us-east-2:445567071188:key/ec6235a7-d3e5-4a63-98c3-00b531fa285d
```

## 5. Launch EC2 instance

AWS Console → EC2 → Launch instance.

Recommended simple UAT settings:

- Name: `kadris-hr-uat`
- AMI: Amazon Linux 2023
- Instance type: `t3.small` or `t3.medium`
- Key pair: create/select one for SSH access
- IAM instance profile: role from Step 4
- Storage: 20–30 GB gp3

Security group inbound:

- SSH 22 from your IP only
- HTTP 80 from tester IPs or temporarily from anywhere for UAT
- Optional HTTPS 443 if you add TLS later

## 6. EC2 user data

In Advanced details → User data, paste:

```bash
#!/bin/bash
set -eux

dnf update -y
dnf install -y docker awscli
systemctl enable --now docker
usermod -aG docker ec2-user
mkdir -p /opt/kadris-hr
chown ec2-user:ec2-user /opt/kadris-hr
```

Launch the instance and wait a few minutes.

## 7. SSH into EC2

From your Mac:

```bash
ssh -i /path/to/key.pem ec2-user@EC2_PUBLIC_DNS
```

## 8. Create app environment file on EC2

On EC2:

```bash
sudo mkdir -p /opt/kadris-hr
sudo nano /opt/kadris-hr/.env
```

Paste UAT env values:

```env
NODE_ENV=production
DEV_AUTH_BYPASS=false
APP_BASE_URL=http://EC2_PUBLIC_DNS
DATABASE_URL=postgresql://USER:PASSWORD@RDS_ENDPOINT:5432/postgres?schema=public
SESSION_SECRET=GENERATE_A_NEW_LONG_RANDOM_SECRET

COGNITO_ISSUER=https://cognito-idp.us-east-2.amazonaws.com/us-east-2_qd744O2J6
COGNITO_DOMAIN=https://us-east-2qd744o2j6.auth.us-east-2.amazoncognito.com
COGNITO_CLIENT_ID=1h3hfa3q1cqa9kdmb7s875a8v1
COGNITO_CLIENT_SECRET=YOUR_COGNITO_CLIENT_SECRET

DOCUMENT_STORAGE_PROVIDER=s3
AWS_REGION=us-east-2
S3_DOCUMENT_BUCKET=kadris-hr-documents-445567071188
S3_DOCUMENT_PREFIX=uat/employee-documents
S3_DOCUMENT_KMS_KEY_ID=ec6235a7-d3e5-4a63-98c3-00b531fa285d
```

Lock down the file:

```bash
sudo chown ec2-user:ec2-user /opt/kadris-hr/.env
chmod 600 /opt/kadris-hr/.env
```

If the EC2 role has S3/KMS permissions, do not put AWS access keys in this file.

## 9. Pull and run the container

On EC2:

```bash
aws ecr get-login-password --region us-east-2   | docker login --username AWS --password-stdin 445567071188.dkr.ecr.us-east-2.amazonaws.com

docker pull 445567071188.dkr.ecr.us-east-2.amazonaws.com/kadris-hr:uat

docker run -d   --name kadris-hr   --restart unless-stopped   --env-file /opt/kadris-hr/.env   -p 80:3000   445567071188.dkr.ecr.us-east-2.amazonaws.com/kadris-hr:uat
```

## 10. Run database migrations

For simple UAT, run migrations from inside the running container:

```bash
docker exec kadris-hr pnpm exec prisma migrate deploy
```

Then seed the first owner/admin:

```bash
docker exec   -e UAT_ADMIN_EMAIL=abolurinkhifayat1@gmail.com   -e UAT_ADMIN_NAME="Khifayat Abolurin"   kadris-hr pnpm run db:seed:uat-admin
```

## 11. Update Cognito URLs

In Cognito app client / hosted UI settings, add:

Callback URL:

```text
http://EC2_PUBLIC_DNS/auth/callback
```

Sign-out URL:

```text
http://EC2_PUBLIC_DNS/login
```

Keep local URLs too:

```text
http://localhost:3000/auth/callback
http://localhost:3000/login
```

For HTTPS/custom domain later, replace `http://EC2_PUBLIC_DNS` with your HTTPS domain.

## 12. Smoke test

Open:

```text
http://EC2_PUBLIC_DNS/api/health
```

Expected response:

```json
{"ok":true,"service":"kadris-hr"}
```

Then open:

```text
http://EC2_PUBLIC_DNS/login
```

Sign in with Cognito and confirm dashboard loads.

## 13. Updating UAT later

From your Mac:

```bash
docker build -t kadris-hr:uat .
docker tag kadris-hr:uat 445567071188.dkr.ecr.us-east-2.amazonaws.com/kadris-hr:uat
docker push 445567071188.dkr.ecr.us-east-2.amazonaws.com/kadris-hr:uat
```

On EC2:

```bash
docker pull 445567071188.dkr.ecr.us-east-2.amazonaws.com/kadris-hr:uat
docker stop kadris-hr
docker rm kadris-hr
docker run -d --name kadris-hr --restart unless-stopped --env-file /opt/kadris-hr/.env -p 80:3000 445567071188.dkr.ecr.us-east-2.amazonaws.com/kadris-hr:uat
docker exec kadris-hr pnpm exec prisma migrate deploy
```
