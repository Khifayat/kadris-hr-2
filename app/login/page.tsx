import Link from "next/link";
import Image from "next/image";
import { isCognitoConfigured } from "@/lib/auth/cognito";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const cognitoConfigured = isCognitoConfigured();
  const devBypass = process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand brand-dark"><Image className="brand-logo" src="/brand/kadris-support-systems.png" alt="Kadris Support Systems" width={1024} height={461} priority /></div>
        <div>
          <p className="eyebrow">HR &amp; Compliance</p>
          <h1>Support your team with confidence.</h1>
          <p>One secure place for onboarding, credentials, approvals, and clear-to-work decisions.</p>
        </div>
        <p className="login-foot">Private system · Authorized personnel only</p>
      </section>
      <section className="login-card">
        {devBypass ? (
          <div>
            <span className="status-badge status-cleared">Development access enabled</span>
            <h2>Local workspace ready</h2>
            <p>You are signed in as the seeded owner administrator for local development.</p>
            <Link className="button button-primary" href="/dashboard">Open dashboard</Link>
          </div>
        ) : cognitoConfigured ? (
          <div>
            {params.error && <span className="status-badge status-rejected">Sign-in failed</span>}
            <h2>Secure sign in</h2>
            <p>Use your Kadris account to access employee records, compliance documents, and reminders.</p>
            <a className="button button-primary" href="/auth/login">Continue with AWS Cognito</a>
          </div>
        ) : (
          <div>
            <h2>Authentication setup required</h2>
            <p>Add the AWS Cognito issuer, domain, app client, and session secret to the deployment environment before inviting users.</p>
          </div>
        )}
      </section>
    </main>
  );
}
