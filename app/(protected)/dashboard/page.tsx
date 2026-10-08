import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/employees/queries";
import { HR_READ_ROLES } from "@/lib/permissions/roles";

export default async function DashboardPage() {
  await requireRole(HR_READ_ROLES);
  const data = await getDashboardData();
  const cards = [
    { label: "Active employees", value: data.active, tone: "blue", note: "Currently active" },
    { label: "Onboarding", value: data.onboarding, tone: "violet", note: "In progress" },
    { label: "Not cleared", value: data.notCleared, tone: "red", note: "Requires attention" },
    { label: "Open reminders", value: data.openReminders, tone: "amber", note: `${data.urgentReminders} urgent` },
  ];

  return (
    <main className="page-wrap dashboard-page">
      <div className="page-heading">
        <div><p className="eyebrow">Overview</p><h1>Good afternoon</h1><p>Here is what needs attention across your team.</p></div>
        <Link className="button button-primary" href="/employees/new">+ Add employee</Link>
      </div>

      {data.notCleared > 0 && (
        <section className="attention-banner">
          <div className="attention-icon">!</div>
          <div><strong>{data.notCleared} {data.notCleared === 1 ? "employee is" : "employees are"} not cleared to work</strong><p>Missing, pending, or expired tasks need HR attention.</p></div>
          <Link href="/employees?status=NOT_CLEARED">Review employees →</Link>
        </section>
      )}

      <section className="metric-grid">
        {cards.map((card) => <article className={`metric-card metric-${card.tone}`} key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small></article>)}
      </section>

      <section className="dashboard-grid">
        <div className="panel dashboard-panel">
          <div className="panel-heading"><div><h2>Recent employees</h2><p>Latest additions to the team</p></div><Link href="/employees">View all</Link></div>
          <div className="employee-stack">
            {data.recentEmployees.map((employee) => (
              <Link className="employee-mini" href={`/employees/${employee.id}`} key={employee.id}>
                <span className="person-avatar">{employee.firstName[0]}{employee.lastName[0]}</span>
                <span><strong>{employee.firstName} {employee.lastName}</strong><small>{employee.jobRole.name}</small></span>
                <span className={`status-badge ${employee.clearanceStatus === "CLEARED" ? "status-cleared" : "status-not-cleared"}`}>{employee.clearanceStatus === "CLEARED" ? "Cleared" : "Not cleared"}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="panel dashboard-panel">
          <div className="panel-heading"><div><h2>Reminder queue</h2><p>Highest-priority compliance nudges</p></div><Link href="/reminders">View all</Link></div>
          <div className="dashboard-queue">
            {data.reminders.map((reminder) => <Link className="queue-item" href={reminder.audience === "HR" ? "/compliance" : `/employees/${reminder.employee.id}`} key={`${reminder.id}:${reminder.employee.id}`}><span className={`queue-dot ${reminder.priority === "CRITICAL" ? "red" : reminder.priority === "HIGH" ? "amber" : "blue"}`} /><div><strong>{reminder.title}</strong><small>{reminder.employee.firstName} {reminder.employee.lastName} · {reminder.detail}</small></div></Link>)}
            {data.reminders.length === 0 && <div className="queue-item"><span className="queue-dot blue" /><div><strong>No reminders due</strong><small>The team is caught up for now</small></div></div>}
            <div className="queue-item"><span className="queue-dot amber" /><div><strong>{data.pendingReview} pending review</strong><small>Documents awaiting HR decision</small></div></div>
            <div className="queue-item"><span className="queue-dot red" /><div><strong>{data.expired} expired credentials</strong><small>Employees may be unable to work</small></div></div>
            <div className="queue-item"><span className="queue-dot blue" /><div><strong>{data.expiring} expiring soon</strong><small>Within the next 30 days</small></div></div>
          </div>
        </div>
      </section>
    </main>
  );
}
