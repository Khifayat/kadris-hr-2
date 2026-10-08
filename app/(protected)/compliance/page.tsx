import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getComplianceQueue } from "@/lib/employees/queries";
import { HR_READ_ROLES } from "@/lib/permissions/roles";

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(value) : "—";
}

function employeeName(employee: { firstName: string; lastName: string; employeeNumber: string }) {
  return `${employee.firstName} ${employee.lastName} · ${employee.employeeNumber}`;
}

export default async function CompliancePage() {
  await requireRole(HR_READ_ROLES);
  const queue = await getComplianceQueue();
  const totalQueue = queue.pendingReview.length + queue.expired.length + queue.expiring.length;

  return <main className="page-wrap workspace-page compliance-page">
    <div className="page-heading"><div><p className="eyebrow">Compliance</p><h1>Compliance queue</h1><p>{totalQueue} item{totalQueue === 1 ? "" : "s"} need review, renewal, or monitoring.</p></div></div>
    <section className="metric-grid compliance-metrics">
      <article className="metric-card metric-amber"><span>Pending review</span><strong>{queue.pendingReview.length}</strong><small>Documents waiting on HR</small></article>
      <article className="metric-card metric-red"><span>Expired</span><strong>{queue.expired.length}</strong><small>Credentials past due</small></article>
      <article className="metric-card"><span>Expiring soon</span><strong>{queue.expiring.length}</strong><small>Within 30 days</small></article>
    </section>
    <section className="compliance-grid">
      <div className="panel queue-panel"><div className="panel-heading"><div><h2>Pending review</h2><p>Approve or reject from the employee profile.</p></div></div><div className="queue-table">
        {queue.pendingReview.length === 0 ? <div className="empty-state compact"><strong>No pending reviews</strong><p>Submitted documents will appear here.</p></div> : queue.pendingReview.map((item) => <Link href={`/employees/${item.employee.id}`} className="queue-row" key={item.id}><span><strong>{item.requirement.name}</strong><small>{employeeName(item.employee)}</small></span><span>{item.documents[0] ? item.documents[0].fileName : "No file"}</span><span>{item.documents[0] ? formatDate(item.documents[0].uploadedAt) : "—"}</span><i>Review</i></Link>)}
      </div></div>
      <div className="panel queue-panel"><div className="panel-heading"><div><h2>Renewals</h2><p>Expired and upcoming credentials.</p></div></div><div className="queue-table">
        {queue.expired.map((item) => <Link href={`/employees/${item.employee.id}`} className="queue-row danger" key={item.id}><span><strong>{item.requirement.name}</strong><small>{employeeName(item.employee)}</small></span><span>Expired</span><span>{formatDate(item.expirationDate)}</span><i>Open</i></Link>)}
        {queue.expiring.map((item) => <Link href={`/employees/${item.employee.id}`} className="queue-row" key={item.id}><span><strong>{item.requirement.name}</strong><small>{employeeName(item.employee)}</small></span><span>Expiring soon</span><span>{formatDate(item.expirationDate)}</span><i>Open</i></Link>)}
        {queue.expired.length === 0 && queue.expiring.length === 0 && <div className="empty-state compact"><strong>No renewals due</strong><p>Upcoming expirations will appear here.</p></div>}
      </div></div>
    </section>
  </main>;
}
