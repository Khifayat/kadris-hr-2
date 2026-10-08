import Link from "next/link";
import { notFound } from "next/navigation";
import { calculateEmployeeClearance, categorizeExpiration } from "@/lib/compliance";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeProfile } from "@/lib/employees/queries";
import { canManageEmployees, HR_READ_ROLES } from "@/lib/permissions/roles";
import { DeleteEmployeeForm } from "@/components/employees/delete-employee-form";
import { approveRequirementAction, inviteEmployeeUserAction, rejectRequirementAction, submitDocumentAction } from "./actions";

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(value) : "—";
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default async function EmployeeProfilePage({ params, searchParams }: PageProps<"/employees/[id]">) {
  const user = await requireRole(HR_READ_ROLES);
  const { id } = await params;
  const accessStatus = (await searchParams).access;
  const employee = await getEmployeeProfile(id);
  if (!employee) notFound();
  const canManage = canManageEmployees(user.role);
  const now = new Date();
  const complianceRows = employee.requirements.map((item) => ({ id: item.id, name: item.requirement.name, status: item.status, active: item.active, requiredBeforeWork: item.requiredBeforeWork, conditional: item.conditional, conditionSatisfied: item.conditionSatisfied, expires: item.expires, expirationDate: item.expirationDate, reminderDays: item.reminderDays }));
  const clearance = calculateEmployeeClearance(complianceRows, now);
  const applicable = employee.requirements.filter((item) => !item.conditional || item.conditionSatisfied);
  const approved = applicable.filter((item) => item.status === "APPROVED" && (!item.expirationDate || categorizeExpiration(item.expirationDate, item.reminderDays, now).category !== "EXPIRED")).length;
  const completion = applicable.length ? Math.round((approved / applicable.length) * 100) : 0;

  return <main className="page-wrap">
    <Link className="back-link" href="/employees">← Back to employees</Link>
    {accessStatus === "invited" && <section className="attention-banner"><div className="attention-icon">✓</div><div><strong>Account invitation sent</strong><p>Cognito emailed first-login instructions to {employee.email}.</p></div></section>}
    {accessStatus === "pending" && <section className="attention-banner"><div className="attention-icon">i</div><div><strong>Account invitation not sent</strong><p>The employee record and app user are ready. Send the invitation when access should begin.</p></div></section>}
    {accessStatus === "invite_failed" && <section className="attention-banner"><div className="attention-icon">!</div><div><strong>Employee created, but invitation failed</strong><p>Check Cognito configuration or IAM permissions, then use Send invitation below.</p></div></section>}
    <section className="profile-hero"><div className="profile-avatar">{employee.firstName[0]}{employee.lastName[0]}</div><div className="profile-title"><div><p>{employee.employeeNumber}</p><h1>{employee.firstName} {employee.lastName}</h1><span>{employee.jobRole.name} · {employee.jobRole.department}</span></div><span className={`clearance-pill ${clearance.cleared ? "cleared" : "blocked"}`}><i />{clearance.cleared ? "Cleared to work" : "Not cleared"}</span></div></section>
    {!clearance.cleared && <section className="attention-banner"><div className="attention-icon">!</div><div><strong>{clearance.reasons.length} clearance {clearance.reasons.length === 1 ? "blocker" : "blockers"}</strong><p>{clearance.reasons.map((reason) => `${reason.requirement}: ${reason.reason.replaceAll("_", " ").toLowerCase()}`).join(" · ")}</p></div></section>}
    <section className="profile-grid"><div className="panel profile-main"><div className="panel-heading"><div><h2>Compliance checklist</h2><p>{approved} of {applicable.length} applicable requirements approved</p></div><strong className="completion-number">{completion}%</strong></div><div className="progress-large"><i style={{ width: `${completion}%` }} /></div><div className="checklist">
      {employee.requirements.map((item) => {
        const inactiveCondition = item.conditional && !item.conditionSatisfied;
        const expiration = item.expirationDate ? categorizeExpiration(item.expirationDate, item.reminderDays, now) : null;
        const visualStatus = inactiveCondition ? "NOT_APPLICABLE" : expiration?.category === "EXPIRED" ? "EXPIRED" : item.status;
        return <article className="checklist-row checklist-row-expanded" key={item.id}><span className={`requirement-icon req-${visualStatus.toLowerCase().replaceAll("_", "-")}`}>{visualStatus === "APPROVED" ? "✓" : visualStatus === "NOT_APPLICABLE" ? "–" : "!"}</span><div className="requirement-body"><div className="requirement-summary"><div><strong>{item.requirement.name}</strong><small>{item.requiredBeforeWork ? "Required before work" : "Post-hire requirement"}{item.requiresApproval ? " · HR approval required" : ""}</small></div><div className="requirement-meta"><span className={`status-badge status-${visualStatus.toLowerCase().replaceAll("_", "-")}`}>{visualStatus.replaceAll("_", " ").toLowerCase()}</span><small>{item.expirationDate ? `Expires ${formatDate(item.expirationDate)}` : item.expires ? "Expiration needed" : "No expiration"}</small></div></div>
          {item.documents.length > 0 && <div className="document-stack">{item.documents.map((document) => <a href={`/documents/${document.id}`} className="document-chip" key={document.id}><span>{document.fileName}</span><small>{formatBytes(document.sizeBytes)} · {document.uploadedBy.name} · {formatDate(document.uploadedAt)}</small></a>)}</div>}
          {item.status === "REJECTED" && item.rejectionReason && <div className="review-note rejected-note"><strong>Rejected by {item.rejectedBy?.name || "HR"}</strong><span>{item.rejectionReason}</span></div>}
          {item.status === "APPROVED" && item.approvedBy && <div className="review-note"><strong>Approved by {item.approvedBy.name}</strong><span>{item.approvedAt ? formatDate(item.approvedAt) : ""}</span></div>}
          {canManage && !inactiveCondition && item.status !== "PENDING_REVIEW" && visualStatus !== "APPROVED" && <form className="upload-form" action={submitDocumentAction}>
            <input type="hidden" name="employeeId" value={employee.id} />
            <input type="hidden" name="employeeRequirementId" value={item.id} />
            <label><span>Document</span><input type="file" name="file" accept=".pdf,image/*,.txt" required /></label>
            {item.expires && <label><span>Expiration date</span><input type="date" name="expirationDate" required /></label>}
            <button className="button button-secondary" type="submit">Submit for review</button>
          </form>}
          {canManage && item.status === "PENDING_REVIEW" && <div className="review-actions"><form action={approveRequirementAction}><input type="hidden" name="employeeRequirementId" value={item.id} /><button className="button button-primary" type="submit">Approve</button></form><form className="reject-form" action={rejectRequirementAction}><input type="hidden" name="employeeRequirementId" value={item.id} /><input name="rejectionReason" placeholder="Reason for rejection" required /><button className="button button-danger" type="submit">Reject</button></form></div>}
        </div></article>;
      })}
    </div></div><aside className="profile-side"><section className="panel"><h2>Employment</h2><dl className="detail-list"><div><dt>Status</dt><dd>{employee.status.toLowerCase()}</dd></div><div><dt>Hire date</dt><dd>{formatDate(employee.hireDate)}</dd></div><div><dt>Type</dt><dd>{employee.employmentType.replaceAll("_", " ").toLowerCase()}</dd></div><div><dt>Supervisor</dt><dd>{employee.supervisor ? `${employee.supervisor.firstName} ${employee.supervisor.lastName}` : "Not assigned"}</dd></div><div><dt>Transports</dt><dd>{employee.transportsParticipants ? "Yes" : "No"}</dd></div><div><dt>Medication duties</dt><dd>{employee.performsMedicationDuties ? "Yes" : "No"}</dd></div></dl></section><section className="panel"><h2>App access</h2>{employee.user ? <><p>{employee.user.authProviderId.startsWith("cognito:") ? "Cognito account provisioned" : "Invitation pending"}</p>{canManage && <form action={inviteEmployeeUserAction}><input type="hidden" name="employeeId" value={employee.id} /><button className="button button-secondary" type="submit">{employee.user.authProviderId.startsWith("cognito:") ? "Resend invitation" : "Send invitation"}</button></form>}</> : <p>No linked app user.</p>}</section><section className="panel"><h2>Contact</h2><dl className="detail-list"><div><dt>Email</dt><dd>{employee.email}</dd></div><div><dt>Phone</dt><dd>{employee.phone || "Not provided"}</dd></div></dl></section><section className="panel"><h2>Recent activity</h2><div className="audit-list">{employee.auditLogs.map((entry) => <div key={entry.id}><i /><span><strong>{entry.action.replaceAll("_", " ").toLowerCase()}</strong><small>{entry.actor?.name || "System"} · {formatDate(entry.createdAt)}</small></span></div>)}</div></section>{canManage && <section className="panel danger-zone"><h2>Danger zone</h2><p>Deleting this employee permanently removes their profile, compliance records, and documents. Their linked app access will be disabled.</p><DeleteEmployeeForm employeeId={employee.id} employeeName={`${employee.firstName} ${employee.lastName}`} /></section>}</aside></section>
  </main>;
}
