import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getReminderInbox } from "@/lib/reminders/queries";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(value);
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

export default async function RemindersPage() {
  const user = await requireUser();
  const inbox = await getReminderInbox(user);

  return <main className="page-wrap">
    <div className="page-heading"><div><p className="eyebrow">Reminders</p><h1>Compliance reminders</h1><p>{inbox.reminders.length} reminder{inbox.reminders.length === 1 ? "" : "s"} need action or monitoring.</p></div></div>
    <section className="metric-grid reminder-metrics">
      <article className="metric-card metric-red"><span>Critical</span><strong>{inbox.critical}</strong><small>Expired or urgent items</small></article>
      <article className="metric-card metric-amber"><span>High priority</span><strong>{inbox.high}</strong><small>Blocking or near-due items</small></article>
      <article className="metric-card"><span>HR review</span><strong>{inbox.hrReview}</strong><small>Submitted documents awaiting decision</small></article>
      <article className="metric-card metric-violet"><span>Employee action</span><strong>{inbox.employeeAction}</strong><small>Missing, rejected, or renewal items</small></article>
    </section>
    <section className="panel reminder-panel"><div className="panel-heading"><div><h2>Reminder inbox</h2><p>Generated from live compliance status and expiration rules.</p></div></div>
      <div className="reminder-list">
        {inbox.reminders.length === 0 ? <div className="empty-state compact"><strong>No reminders due</strong><p>Missing, rejected, pending, expired, and expiring items will appear here.</p></div> : inbox.reminders.map((reminder) => <Link className={`reminder-row priority-${reminder.priority.toLowerCase()}`} href={reminder.href} key={`${reminder.id}:${reminder.employee.id}`}><span className="reminder-dot" /><span><strong>{reminder.title}</strong><small>{reminder.employee.firstName} {reminder.employee.lastName} · {reminder.employee.employeeNumber} · {reminder.detail}</small></span><span className="reminder-tags"><i>{label(reminder.priority)}</i><i>{reminder.audience === "HR" ? "HR review" : "employee action"}</i></span><time>{formatDate(reminder.updatedAt)}</time></Link>)}
      </div>
    </section>
  </main>;
}
