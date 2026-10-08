import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { updateOwnProfileAction } from "./actions";

function initialsFor(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const user = await requireUser();
  const params = await searchParams;
  const updated = params.updated === "1";

  return <main className="page-wrap narrow workspace-page account-profile-page">
    <div className="page-heading"><div><p className="eyebrow">Account</p><h1>Your profile</h1><p>Keep your Kadris HR account details current.</p></div><div className="profile-page-actions"><Link className="button button-secondary" href="/dashboard">Back to dashboard</Link><a className="button button-secondary" href="/auth/logout">Sign out</a></div></div>
    {updated && <section className="success-banner" role="status"><strong>Profile updated</strong><span>Your account details have been saved.</span></section>}
    <section className="panel account-profile-card">
      <div className="account-profile-summary"><span className="account-profile-avatar">{initialsFor(user.name)}</span><div><h2>{user.name}</h2><p>{user.role.replaceAll("_", " ").toLowerCase()}</p></div></div>
      <form className="account-profile-form" action={updateOwnProfileAction}>
        <label>Display name<input name="name" defaultValue={user.name} required autoComplete="name" /></label>
        <label>Contact email<input name="email" type="email" defaultValue={user.email} required autoComplete="email" /></label>
        <div className="account-profile-access"><strong>Access level</strong><span>{user.role.replaceAll("_", " ").toLowerCase()}</span><small>Access level changes are managed in Users &amp; Access.</small></div>
        <div className="form-actions"><button className="button button-primary" type="submit">Save profile</button></div>
      </form>
    </section>
  </main>;
}
