import Link from "next/link";

export default function UnauthorizedPage() {
  return <main className="centered-state"><h1>Access restricted</h1><p>Your role does not permit this action.</p><Link className="button button-primary" href="/dashboard">Back to dashboard</Link></main>;
}
