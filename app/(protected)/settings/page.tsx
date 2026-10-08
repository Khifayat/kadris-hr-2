import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { canManageAppUsers, HR_WRITE_ROLES } from "@/lib/permissions/roles";
import { getSettingsData } from "@/lib/settings/queries";
import { CONDITION_OPTIONS } from "@/lib/settings/schema";
import { employeeLabel, getUsersAccessData } from "@/lib/users/queries";
import { SettingsPopoverDismiss } from "@/components/settings/settings-popover-dismiss";
import {
  createAppUserAction,
  createJobRoleAction,
  createRequirementAction,
  deactivateAppUserAction,
  reactivateAppUserAction,
  removeRoleRequirementAction,
  updateAppUserAction,
  upsertRoleRequirementAction,
} from "./actions";

const accessRoles = ["OWNER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"];

const requirementTypes = [
  "DOCUMENT",
  "BACKGROUND_CHECK",
  "CERTIFICATION",
  "TRAINING",
  "ACKNOWLEDGEMENT",
  "HEALTH_SCREENING",
  "OTHER",
];

function title(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const currentUser = await requireRole(HR_WRITE_ROLES);
  const params = await searchParams;
  const [data, accessData] = await Promise.all([
    getSettingsData(typeof params.roleId === "string" ? params.roleId : undefined),
    canManageAppUsers(currentUser.role) ? getUsersAccessData() : Promise.resolve(null),
  ]);
  const selectedRole = data.selectedRole;
  const requestedTab = typeof params.tab === "string" ? params.tab : "roles";
  const settingsTab = ["roles", "requirements", "users", "rules"].includes(requestedTab) ? requestedTab : "roles";
  const selectedRequirementIds = new Set(selectedRole?.requirements.map((item) => item.requirementId) ?? []);
  const assignableRequirements = data.requirements.filter((requirement) => requirement.active && !selectedRequirementIds.has(requirement.id));

  return <main className="page-wrap workspace-page settings-page" data-settings-tab={settingsTab}>
    <SettingsPopoverDismiss />
    <div className="page-heading"><div><p className="eyebrow">Configuration</p><h1>Settings</h1><p>Manage the role and compliance rules that drive employee clearance.</p></div></div>
    <nav className="section-tabs settings-tabs" aria-label="Settings sections">
      <Link className={settingsTab === "roles" ? "active" : ""} href="/settings?tab=roles">Job roles</Link>
      <Link className={settingsTab === "requirements" ? "active" : ""} href="/settings?tab=requirements">Tasks</Link>
      {accessData && <Link className={settingsTab === "users" ? "active" : ""} href="/settings?tab=users">Users &amp; Access</Link>}
      <Link className={settingsTab === "rules" ? "active" : ""} href={`/settings?tab=rules${selectedRole ? `&roleId=${selectedRole.id}` : ""}`}>Role rules</Link>
    </nav>

    <section className="settings-grid">
      <div className="panel settings-panel"><div className="panel-heading settings-sticky-heading"><div><h2>Job roles</h2><p>{data.roles.length} role{data.roles.length === 1 ? "" : "s"} configured</p></div><details className="settings-create" id="create-role"><summary className="button button-primary button-compact">+ New Role</summary><form className="settings-form" action={createJobRoleAction}><h3>Add role</h3><label>Role name<input name="name" required placeholder="Program Coordinator" /></label><label>Department<input name="department" required placeholder="Programs" /></label><label>Description<input name="description" placeholder="Optional" /></label><button className="button button-primary" type="submit">Create role</button></form></details></div>
        <div className="settings-list">
          {data.roles.map((role) => <Link className={`settings-list-item ${selectedRole?.id === role.id ? "active" : ""}`} href={`/settings?roleId=${role.id}`} key={role.id}><span><strong>{role.name}</strong><small>{role.department} · {role._count.employees} employees</small></span><span className="role-requirement-count"><strong>{role.requirements.length}</strong><small>task{role.requirements.length === 1 ? "" : "s"}</small></span></Link>)}
        </div>
      </div>

      <div className="panel settings-panel"><div className="panel-heading settings-sticky-heading"><div><h2>Task library</h2><p>{data.requirements.length} reusable task{data.requirements.length === 1 ? "" : "s"}</p></div><details className="settings-create"><summary className="button button-primary button-compact">+ New Task</summary><form className="settings-form" action={createRequirementAction}><h3>Add task</h3><div className="settings-form-grid"><label>Name<input name="name" required placeholder="TB Screening" /></label><label>Type<select name="requirementType" defaultValue="DOCUMENT">{requirementTypes.map((type) => <option value={type} key={type}>{title(type)}</option>)}</select></label><label>Description<input name="description" placeholder="Optional" /></label><label>Expiration period<input name="expirationPeriodDays" type="number" min="1" placeholder="365" /></label></div><div className="settings-checks"><label><input name="expires" type="checkbox" /> Expires</label><input name="requiresApproval" type="hidden" value="off" /><label><input name="requiresApproval" type="checkbox" defaultChecked /> Requires HR approval</label></div><label>Reminder days<input name="reminderDays" defaultValue="60,30,7" /></label><button className="button button-primary" type="submit">Create task</button></form></details></div>
        <div className="requirement-library">
          {data.requirements.map((requirement) => <article key={requirement.id}><strong>{requirement.name}</strong><small>{title(requirement.requirementType)} · {requirement.expires ? `expires${requirement.expirationPeriodDays ? ` every ${requirement.expirationPeriodDays} days` : ""}` : "no expiration"} · {requirement._count.jobRoles} roles</small></article>)}
        </div>
      </div>
    </section>



    {accessData && <section className="panel users-access-panel" id="users-access"><div className="panel-heading access-panel-heading settings-sticky-heading"><div><h2>Users & Access</h2><p>Control who Cognito can authorize into Kadris HR and what role they receive.</p></div><div className="settings-header-actions"><span className="access-count">{accessData.users.length} user{accessData.users.length === 1 ? "" : "s"}</span><details className="settings-create"><summary className="button button-primary button-compact">+ New User</summary><form className="settings-form access-create-form" action={createAppUserAction}><div className="access-create-heading"><div><h3>Add app user</h3><p>Create access for an administrator, manager, or employee.</p></div></div><div className="settings-form-grid access-create-grid"><label>Name<input name="name" required placeholder="Jordan Smith" /></label><label>Email<input name="email" type="email" required placeholder="person@kadrissupport.com" /></label><label>Role<select name="role" defaultValue="EMPLOYEE">{accessRoles.map((role) => <option value={role} key={role}>{title(role)}</option>)}</select></label><label>Employee profile<select name="employeeId" defaultValue=""><option value="">Not linked</option>{accessData.employees.filter((employee) => !employee.user).map((employee) => <option value={employee.id} key={employee.id}>{employeeLabel(employee)}</option>)}</select></label></div><button className="button button-primary" type="submit">Add user</button></form></details></div></div>
      <div className="access-table">
        {accessData.users.map((user) => {
          const linkedToCognito = user.authProviderId.startsWith("cognito:");
          const ownerProtected = user.role === "OWNER_ADMIN" && currentUser.role !== "OWNER_ADMIN";
          const employeeOptions = accessData.employees.filter((employee) => !employee.user || employee.user.id === user.id);
          return <article className={`access-row ${user.active ? "" : "inactive"}`} key={user.id}>
            <div className="access-row-header"><div className="access-summary"><span className="person-avatar">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div>
              <div className="access-state-actions"><div className="access-badges"><span className={`status-badge ${user.active ? "status-approved" : "status-rejected"}`}>{user.active ? "active" : "inactive"}</span><span className={`status-badge ${linkedToCognito ? "status-cleared" : "status-neutral"}`}>{linkedToCognito ? "Cognito linked" : "pending login"}</span><span className="status-badge status-neutral">{title(user.role)}</span>{ownerProtected && <span className="status-badge status-neutral">owner protected</span>}</div>
                {!ownerProtected && <form action={user.active ? deactivateAppUserAction : reactivateAppUserAction} className="access-status-form">
                  <input type="hidden" name="userId" value={user.id} />
                  <button className={`button button-compact ${user.active ? "button-danger-outline" : "button-primary"}`} type="submit" disabled={user.id === currentUser.id}>{user.active ? "Deactivate" : "Reactivate"}</button>
                </form>}
              </div>
            </div>
            <form className="access-edit-form" action={updateAppUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <label>Name<input name="name" defaultValue={user.name} required disabled={ownerProtected} /></label>
              <label>Email<input name="email" type="email" defaultValue={user.email} required disabled={ownerProtected} /></label>
              <label>Role<select name="role" defaultValue={user.role} disabled={ownerProtected}>{accessRoles.map((role) => <option value={role} key={role}>{title(role)}</option>)}</select></label>
              <label>Employee profile<select name="employeeId" defaultValue={user.employeeId ?? ""} disabled={ownerProtected}><option value="">Not linked</option>{employeeOptions.map((employee) => <option value={employee.id} key={employee.id}>{employeeLabel(employee)}</option>)}</select></label>
              <button className="button button-secondary" type="submit" disabled={ownerProtected}>Save</button>
            </form>
          </article>;
        })}
      </div>
    </section>}

    {selectedRole && <section className="panel role-rules-panel"><div className="panel-heading settings-sticky-heading"><div><h2>{selectedRole.name} rules</h2><p>These tasks are assigned automatically when an employee is created in this role.</p></div><details className="settings-create"><summary className="button button-primary button-compact">+ New Rule</summary><form className="assign-form" action={upsertRoleRequirementAction}><input type="hidden" name="jobRoleId" value={selectedRole.id} /><label>Task<select name="requirementId" required>{assignableRequirements.length === 0 ? <option value="">All active tasks are assigned</option> : assignableRequirements.map((requirement) => <option value={requirement.id} key={requirement.id}>{requirement.name}</option>)}</select></label><label>Condition<select name="conditionKey" defaultValue="">{CONDITION_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><label className="checkbox-inline"><input name="requiredBeforeWork" type="checkbox" defaultChecked /> Required before work</label><button className="button button-primary" type="submit" disabled={assignableRequirements.length === 0}>Assign task</button></form></details></div>
      <div className="role-rule-list">
        {selectedRole.requirements.length === 0 ? <div className="empty-state compact"><strong>No tasks assigned</strong><p>Add a task below to start enforcing this role.</p></div> : selectedRole.requirements.map((mapping) => <article className="role-rule-row" key={mapping.id}><span><strong>{mapping.requirement.name}</strong><small>{title(mapping.requirement.requirementType)} · {mapping.requiredBeforeWork ? "required before work" : "post-hire"}{mapping.conditionKey ? ` · ${CONDITION_OPTIONS.find((option) => option.value === mapping.conditionKey)?.label}` : ""}</small></span><span className={`status-badge ${mapping.requirement.expires ? "status-expiring-soon" : "status-neutral"}`}>{mapping.requirement.expires ? "expires" : "no expiration"}</span><form action={removeRoleRequirementAction}><input type="hidden" name="mappingId" value={mapping.id} /><button className="button button-secondary" type="submit">Remove</button></form></article>)}
      </div>
    </section>}
  </main>;
}
