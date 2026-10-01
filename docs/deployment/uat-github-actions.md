# UAT deployment with GitHub Actions and ECR

GitHub Actions builds the `linux/amd64` Docker image and pushes two tags to ECR: `uat` and the immutable Git commit SHA. EC2 only pulls and starts the finished image, so a `t3.micro` does not need enough memory to compile Next.js.

## One-time AWS setup

1. Add GitHub's OIDC provider, `https://token.actions.githubusercontent.com`, with audience `sts.amazonaws.com` if the account does not already have it.
2. Create an IAM role using `infra/iam/github-actions-ecr-trust.json` as its trust policy.
3. Attach `infra/iam/github-actions-ecr-policy.json` as an inline policy.
4. Add the role ARN to the GitHub repository secret `AWS_GITHUB_ACTIONS_ROLE_ARN`.
5. Ensure the EC2 role can pull from the `kadris-hr` ECR repository and has the Cognito permissions in `infra/iam/cognito-user-invitations.json`.

## One-time EC2 setup

Copy `scripts/deploy-uat-from-ecr.sh` to `/usr/local/bin/kadris-hr-update`, make it executable, and install `infra/systemd/kadris-hr-update.service` as `/etc/systemd/system/kadris-hr-update.service`.

Enable deployment whenever the instance starts:

```bash
sudo systemctl daemon-reload
sudo systemctl enable kadris-hr-update.service
```

Deploy without restarting EC2:

```bash
sudo systemctl start kadris-hr-update.service
sudo systemctl status kadris-hr-update.service
```

The deploy script pulls the `uat` image, applies Prisma migrations, starts the container, verifies `/api/health`, and restores the previous image if the health check fails.
