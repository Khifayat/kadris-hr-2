import { redirect } from "next/navigation";
import { clearAuthCookies, getCognitoConfig } from "@/lib/auth/cognito";

export async function GET() {
  await clearAuthCookies();
  const config = getCognitoConfig();
  if (!config) redirect("/login");
  const logoutUrl = new URL("/logout", config.domain);
  logoutUrl.searchParams.set("client_id", config.clientId);
  logoutUrl.searchParams.set("logout_uri", `${config.appBaseUrl}/login`);
  redirect(logoutUrl.toString());
}
