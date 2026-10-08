import { calculateEmployeeClearance, categorizeExpiration } from "@/lib/compliance";
import { requireUser } from "@/lib/auth/session";
import { canReadHrWorkspace } from "@/lib/permissions/roles";
import { getEmployeePortalOptions, getEmployeePortalProfile } from "@/lib/portal/queries";
import { submitMyDocumentAction } from "./actions";

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(value) : "—";
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default async function MyRequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const canPreview = canReadHrWorkspace(user.role);
  const previewOptions = canPreview ? await getEmployeePortalOptions() : [];
  const requestedEmployeeId = typeof params.employeeId === "string" ? params.employeeId : null;
  const employeeId = canPreview ? requestedEmployeeId ?? previewOptions[0]?.id ?? null : user.employeeId;
  const employee = employeeId ? await getEmployeePortalProfile(employeeId) : null;
  const now = new Date();

  if (!employee) {
    return <main className="page-wrap"><div className="page-heading"><div><p className="eyebrow">Self service</p><h1>My tasks</h1><p>Your user account is not linked to an employee profile yet.</p></div></div><section className="panel empty-state"><strong>No employee profile found</strong><p>Ask HR to link your login to your employee record before submitting documents.</p></section></main>;
  }

  const rows = employee.requirements.map((item) => ({ id: item.id, name: item.requirement.name, status: item.status, active: item.active, requiredBeforeWork: item.requiredBeforeWork, conditional: item.conditional, conditionSatisfied: item.conditionSatisfied, expires: item.expires, expirationDate: item.expirationDate, reminderDays: item.reminderDays }));
  const clearance = calculateEmployeeClearance(rows, now);
  const applicable = employee.requirements.filter((item) => !item.conditional || item.conditionSatisfied);
  const approved = applicable.filter((item) => item.status === "APPROVED" && (!item.expirationDate || categorizeExpiration(item.expirationDate, item.reminderDays, now).category !== "EXPIRED")).length;
  const completion = applicable.length ? Math.round((approved / applicable.length) * 100) : 0;

  return <main className="page-wrap workspace-page requirements-page">
    <div className="page-heading"><div><p className="eyebrow">Self service</p><h1>My tasks</h1><p>{employee.firstName} {employee.lastName} · {employee.jobRole.name} · {completion}% complete</p></div>{canPreview && <form className="portal-switcher" action="/my-requirements"><label>Preview employee<select defaultValue={employee.id} name="employeeId">{previewOptions.map((option) => <option value={option.id} key={option.id}>{option.firstName} {option.lastName} · {option.employeeNumber}</option>)}</select></label><button className="button button-secondary" type="submit">Open</button></form>}</div>

    {!clearance.cleared && <section className="attention-banner"><div className="attention-icon">!</div><div><strong>{clearance.reasons.length} item{clearance.reasons.length === 1 ? "" : "s"} blocking clearance</strong><p>Submit missing or rejected documents here. HR will review them before your clearance changes.</p></div></section>}

    <section className="portal-summary-grid">
      <article className={`portal-status-card ${clearance.cleared ? "cleared" : "blocked"}`}><span>Work clearance</span><strong>{clearance.cleared ? "Cleared" : "Not cleared"}</strong><small>{clearance.cleared ? "All required pre-work items are approved" : "HR review or documents still needed"}</small></article>
      <article className="portal-status-card"><span>Checklist</span><strong>{approved}/{applicable.length}</strong><small>Applicable tasks approved</small></article>
      <article className="portal-status-card"><span>Pending review</span><strong>{employee.requirements.filter((item) => item.status === "PENDING_REVIEW").length}</strong><small>Submitted to HR</small></article>
    </section>

    <section className="panel profile-main"><div className="panel-heading"><div><h2>Task checklist</h2><p>Upload evidence for items that are missing, rejected, or expired.</p></div><strong className="completion-number">{completion}%</strong></div><div className="progress-large"><i style={{ width: `${completion}%` }} /></div><div className="checklist">
      {employee.requirements.map((item) => {
        const inactiveCondition = item.conditional && !item.conditionSatisfied;
        const expiration = item.expirationDate ? categorizeExpiration(item.expirationDate, item.reminderDays, now) : null;
        const visualStatus = inactiveCondition ? "NOT_APPLICABLE" : expiration?.category === "EXPIRED" ? "EXPIRED" : item.status;
        const canSubmit = !inactiveCondition && item.status !== "PENDING_REVIEW" && visualStatus !== "APPROVED";
        return <article className="checklist-row checklist-row-expanded" key={item.id}><span className={`requirement-icon req-${visualStatus.toLowerCase().replaceAll("_", "-")}`}>{visualStatus === "APPROVED" ? "✓" : visualStatus === "NOT_APPLICABLE" ? "–" : "!"}</span><div className="requirement-body"><div className="requirement-summary"><div><strong>{item.requirement.name}</strong><small>{item.requiredBeforeWork ? "Required before work" : "Post-hire task"}{item.requirement.description ? ` · ${item.requirement.description}` : ""}</small></div><div className="requirement-meta"><span className={`status-badge status-${visualStatus.toLowerCase().replaceAll("_", "-")}`}>{statusLabel(visualStatus)}</span><small>{inactiveCondition ? "Not applicable" : item.expirationDate ? `Expires ${formatDate(item.expirationDate)}` : item.expires ? "Expiration needed" : "No expiration"}</small></div></div>
          {item.documents.length > 0 && <div className="document-stack">{item.documents.map((document) => <a href={`/documents/${document.id}`} className="document-chip" key={document.id}><span>{document.fileName}</span><small>{formatBytes(document.sizeBytes)} · submitted {formatDate(document.uploadedAt)}</small></a>)}</div>}
          {item.status === "PENDING_REVIEW" && <div className="review-note"><strong>Submitted to HR</strong><span>Pending review</span></div>}
          {item.status === "REJECTED" && item.rejectionReason && <div className="review-note rejected-note"><strong>Rejected</strong><span>{item.rejectionReason}</span></div>}
          {canSubmit && <form className="upload-form" action={submitMyDocumentAction}>
            <input type="hidden" name="employeeId" value={employee.id} />
            <input type="hidden" name="employeeRequirementId" value={item.id} />
            <label><span>Document</span><input type="file" name="file" accept=".pdf,image/*,.txt" required /></label>
            {item.expires && <label><span>Expiration date</span><input type="date" name="expirationDate" required /></label>}
            <button className="button button-primary" type="submit">{item.status === "REJECTED" ? "Resubmit" : "Submit document"}</button>
          </form>}
        </div></article>;
      })}
    </div></section>
  </main>;
}
