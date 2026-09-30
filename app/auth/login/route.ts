import { redirect } from "next/navigation";
import { createCognitoLoginRedirect, isCognitoConfigured } from "@/lib/auth/cognito";

export async function GET() {
  if (!isCognitoConfigured()) redirect("/login");
  redirect((await createCognitoLoginRedirect()).toString());
}
