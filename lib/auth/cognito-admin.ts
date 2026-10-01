import "server-only";

import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  type AdminGetUserCommandOutput,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

function getAdminConfig() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const region = process.env.AWS_REGION;
  if (!userPoolId || !region) {
    throw new Error("COGNITO_USER_POOL_ID and AWS_REGION are required to invite employees.");
  }
  return { userPoolId, region };
}

function getSub(attributes?: Array<{ Name?: string; Value?: string }>) {
  return attributes?.find((attribute) => attribute.Name === "sub")?.Value ?? null;
}

export async function inviteCognitoUser(input: { email: string; name: string }) {
  const config = getAdminConfig();
  const client = new CognitoIdentityProviderClient({ region: config.region });
  let existing: AdminGetUserCommandOutput | null = null;

  try {
    existing = await client.send(new AdminGetUserCommand({ UserPoolId: config.userPoolId, Username: input.email }));
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "UserNotFoundException") throw error;
  }

  if (existing) {
    if (existing.UserStatus !== "CONFIRMED") {
      await client.send(new AdminCreateUserCommand({
        UserPoolId: config.userPoolId,
        Username: input.email,
        MessageAction: "RESEND",
        DesiredDeliveryMediums: ["EMAIL"],
      }));
    }
    return { sub: getSub(existing.UserAttributes), status: existing.UserStatus ?? "UNKNOWN" };
  }

  const created = await client.send(new AdminCreateUserCommand({
    UserPoolId: config.userPoolId,
    Username: input.email,
    DesiredDeliveryMediums: ["EMAIL"],
    UserAttributes: [
      { Name: "email", Value: input.email },
      { Name: "name", Value: input.name },
    ],
  }));
  return { sub: getSub(created.User?.Attributes), status: created.User?.UserStatus ?? "UNKNOWN" };
}
