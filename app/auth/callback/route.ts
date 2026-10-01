import { NextResponse } from "next/server";
import { clearAuthCookies, clearOauthCookies, exchangeCodeForIdToken, getCognitoConfig, setAppSessionCookie, validateOauthState, verifyCognitoIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/db/prisma";

function displayName(claims: { name?: string; given_name?: string; family_name?: string; email?: string }) {
  return claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(" ") || claims.email || "Cognito user";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const config = getCognitoConfig();
  if (!config) return NextResponse.redirect(new URL("/login?error=auth_not_configured", url.origin));
  const baseUrl = config.appBaseUrl || url.origin;
  const error = url.searchParams.get("error");
  if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, baseUrl));

  try {
    await validateOauthState(url.searchParams.get("state"));
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Missing authorization code.");

    const claims = await verifyCognitoIdToken(await exchangeCodeForIdToken(code));
    const authProviderId = `cognito:${claims.sub}`;
    const email = claims.email?.toLowerCase();
    if (!email) throw new Error("Cognito account is missing an email address.");

    let user = await prisma.user.findFirst({ where: { authProviderId, active: true } });
    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && !existing.active) return NextResponse.redirect(new URL("/unauthorized", baseUrl));
      if (existing && !existing.authProviderId.startsWith("cognito:")) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { authProviderId, name: existing.name || displayName(claims) },
        });
      }
    }

    if (!user) return NextResponse.redirect(new URL("/unauthorized", baseUrl));
    await setAppSessionCookie({ userId: user.id, authProviderId });
    await clearOauthCookies();
    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  } catch {
    await clearAuthCookies();
    return NextResponse.redirect(new URL("/login?error=auth_failed", baseUrl));
  }
}
