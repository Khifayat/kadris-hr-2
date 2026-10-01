import "server-only";

import { createHash, createHmac, createPublicKey, createVerify, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const APP_SESSION_COOKIE = "kadris_session";
export const STATE_COOKIE = "kadris_oauth_state";
export const VERIFIER_COOKIE = "kadris_pkce_verifier";
export const NONCE_COOKIE = "kadris_oidc_nonce";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

type CognitoConfig = {
  issuer: string;
  domain: string;
  clientId: string;
  clientSecret?: string;
  appBaseUrl: string;
  sessionSecret: string;
};

type JwtHeader = {
  alg: string;
  kid: string;
  typ?: string;
};

type IdTokenClaims = {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  nonce?: string;
};

export type AppSessionPayload = {
  userId: string;
  authProviderId: string;
  exp: number;
};

type Jwk = {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
};

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function decodeBase64UrlJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Cognito authentication.`);
  return value;
}

export function getCognitoConfig(): CognitoConfig | null {
  if (!process.env.COGNITO_ISSUER || !process.env.COGNITO_DOMAIN || !process.env.COGNITO_CLIENT_ID) {
    return null;
  }
  return {
    issuer: process.env.COGNITO_ISSUER.replace(/\/$/, ""),
    domain: process.env.COGNITO_DOMAIN.replace(/\/$/, ""),
    clientId: process.env.COGNITO_CLIENT_ID,
    clientSecret: process.env.COGNITO_CLIENT_SECRET || undefined,
    appBaseUrl: (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, ""),
    sessionSecret: requireEnv("SESSION_SECRET"),
  };
}

export function isCognitoConfigured() {
  return getCognitoConfig() !== null;
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createAppSession(payload: Omit<AppSessionPayload, "exp">, secret: string) {
  const body = base64Url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }));
  return `${body}.${sign(body, secret)}`;
}

export function verifyAppSession(token: string | undefined, secret: string): AppSessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || sign(body, secret) !== signature) return null;
  const payload = decodeBase64UrlJson<AppSessionPayload>(body);
  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}
export async function setAppSessionCookie(payload: Omit<AppSessionPayload, "exp">) {
  const config = getCognitoConfig();
  if (!config) throw new Error("Cognito is not configured.");
  const cookieStore = await cookies();
  cookieStore.set(APP_SESSION_COOKIE, createAppSession(payload, config.sessionSecret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  for (const name of [APP_SESSION_COOKIE, STATE_COOKIE, VERIFIER_COOKIE, NONCE_COOKIE]) {
    cookieStore.set(name, "", { path: "/", maxAge: 0 });
  }
}

export async function clearOauthCookies() {
  const cookieStore = await cookies();
  for (const name of [STATE_COOKIE, VERIFIER_COOKIE, NONCE_COOKIE]) {
    cookieStore.set(name, "", { path: "/", maxAge: 0 });
  }
}

export async function createCognitoLoginRedirect() {
  const config = getCognitoConfig();
  if (!config) throw new Error("Cognito is not configured.");

  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  };
  cookieStore.set(STATE_COOKIE, state, cookieOptions);
  cookieStore.set(VERIFIER_COOKIE, verifier, cookieOptions);
  cookieStore.set(NONCE_COOKIE, nonce, cookieOptions);

  const authorizeUrl = new URL("/oauth2/authorize", config.domain);
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "openid email");
  authorizeUrl.searchParams.set("redirect_uri", `${config.appBaseUrl}/auth/callback`);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("nonce", nonce);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  return authorizeUrl;
}

export async function exchangeCodeForIdToken(code: string) {
  const config = getCognitoConfig();
  if (!config) throw new Error("Cognito is not configured.");
  const cookieStore = await cookies();
  const verifier = cookieStore.get(VERIFIER_COOKIE)?.value;
  if (!verifier) throw new Error("Login verifier is missing.");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    code,
    redirect_uri: `${config.appBaseUrl}/auth/callback`,
    code_verifier: verifier,
  });
  const headers: HeadersInit = { "Content-Type": "application/x-www-form-urlencoded" };
  if (config.clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
  }

  const response = await fetch(new URL("/oauth2/token", config.domain), {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Cognito token exchange failed.");
  const tokens = await response.json() as { id_token?: string };
  if (!tokens.id_token) throw new Error("Cognito did not return an ID token.");
  return tokens.id_token;
}

async function fetchJwks(issuer: string): Promise<{ keys: Jwk[] }> {
  const response = await fetch(`${issuer}/.well-known/jwks.json`, { cache: "force-cache" });
  if (!response.ok) throw new Error("Unable to fetch Cognito signing keys.");
  return response.json() as Promise<{ keys: Jwk[] }>;
}

export async function verifyCognitoIdToken(idToken: string): Promise<IdTokenClaims> {
  const config = getCognitoConfig();
  if (!config) throw new Error("Cognito is not configured.");
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) throw new Error("Invalid ID token.");

  const header = decodeBase64UrlJson<JwtHeader>(encodedHeader);
  if (header.alg !== "RS256") throw new Error("Unsupported ID token algorithm.");
  const jwks = await fetchJwks(config.issuer);
  const jwk = jwks.keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Cognito signing key not found.");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const valid = verifier.verify(createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(encodedSignature, "base64url"));
  if (!valid) throw new Error("Invalid ID token signature.");

  const claims = decodeBase64UrlJson<IdTokenClaims>(encodedPayload);
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== config.issuer) throw new Error("Invalid ID token issuer.");
  if (claims.aud !== config.clientId) throw new Error("Invalid ID token audience.");
  if (claims.exp <= now) throw new Error("ID token is expired.");
  const nonce = (await cookies()).get(NONCE_COOKIE)?.value;
  if (nonce && claims.nonce !== nonce) throw new Error("Invalid ID token nonce.");
  return claims;
}

export async function validateOauthState(state: string | null) {
  const cookieStore = await cookies();
  const expected = cookieStore.get(STATE_COOKIE)?.value;
  if (!state || !expected || state !== expected) throw new Error("Invalid login state.");
}
