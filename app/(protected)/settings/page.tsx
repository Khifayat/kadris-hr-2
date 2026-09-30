import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { HR_WRITE_ROLES } from "@/lib/permissions/roles";
import { getSettingsData } from "@/lib/settings/queries";
import { CONDITION_OPTIONS } from "@/lib/settings/schema";
import { employeeLabel, getUsersAccessData } from "@/lib/users/queries";
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

const accessRoles = ["OWNER_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"];

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
    currentUser.role === "OWNER_ADMIN" ? getUsersAccessData() : Promise.resolve(null),
  ]);
  const selectedRole = data.selectedRole;
  const selectedRequirementIds = new Set(selectedRole?.requirements.map((item) => item.requirementId) ?? []);
  const assignableRequirements = data.requirements.filter((requirement) => requirement.active && !selectedRequirementIds.has(requirement.id));

  return <main className="page-wrap">
    <div className="page-heading"><div><p className="eyebrow">Configuration</p><h1>Settings</h1><p>Manage the role and compliance rules that drive employee clearance.</p></div></div>

    <section className="settings-grid">
      <div className="panel settings-panel"><div className="panel-heading"><div><h2>Job roles</h2><p>{data.roles.length} role{data.roles.length === 1 ? "" : "s"} configured</p></div></div>
        <div className="settings-list">
          {data.roles.map((role) => <Link className={`settings-list-item ${selectedRole?.id === role.id ? "active" : ""}`} href={`/settings?roleId=${role.id}`} key={role.id}><span><strong>{role.name}</strong><small>{role.department} · {role._count.employees} employees</small></span><i>{role.requirements.length}</i></Link>)}
        </div>
        <form className="settings-form" action={createJobRoleAction}>
          <h3>Add role</h3>
          <label>Role name<input name="name" required placeholder="Program Coordinator" /></label>
          <label>Department<input name="department" required placeholder="Programs" /></label>
          <label>Description<input name="description" placeholder="Optional" /></label>
          <button className="button button-primary" type="submit">Create role</button>
        </form>
      </div>

      <div className="panel settings-panel"><div className="panel-heading"><div><h2>Requirement library</h2><p>{data.requirements.length} reusable requirement{data.requirements.length === 1 ? "" : "s"}</p></div></div>
        <div className="requirement-library">
          {data.requirements.map((requirement) => <article key={requirement.id}><strong>{requirement.name}</strong><small>{title(requirement.requirementType)} · {requirement.expires ? `expires${requirement.expirationPeriodDays ? ` every ${requirement.expirationPeriodDays} days` : ""}` : "no expiration"} · {requirement._count.jobRoles} roles</small></article>)}
        </div>
        <form className="settings-form" action={createRequirementAction}>
          <h3>Add requirement</h3>
          <div className="settings-form-grid">
            <label>Name<input name="name" required placeholder="TB Screening" /></label>
            <label>Type<select name="requirementType" defaultValue="DOCUMENT">{requirementTypes.map((type) => <option value={type} key={type}>{title(type)}</option>)}</select></label>
            <label>Description<input name="description" placeholder="Optional" /></label>
            <label>Expiration period<input name="expirationPeriodDays" type="number" min="1" placeholder="365" /></label>
          </div>
          <div className="settings-checks">
            <label><input name="expires" type="checkbox" /> Expires</label>
            <input name="requiresApproval" type="hidden" value="off" />
            <label><input name="requiresApproval" type="checkbox" defaultChecked /> Requires HR approval</label>
          </div>
          <label>Reminder days<input name="reminderDays" defaultValue="60,30,7" /></label>
          <button className="button button-primary" type="submit">Create requirement</button>
        </form>
      </div>
    </section>



    {accessData && <section className="panel users-access-panel" id="users-access"><div className="panel-heading"><div><h2>Users & Access</h2><p>Control who Cognito can authorize into Kadris HR and what role they receive.</p></div></div>
      <div className="access-table">
        {accessData.users.map((user) => {
          const linkedToCognito = user.authProviderId.startsWith("cognito:");
          const employeeOptions = accessData.employees.filter((employee) => !employee.user || employee.user.id === user.id);
          return <article className={`access-row ${user.active ? "" : "inactive"}`} key={user.id}>
            <div className="access-summary"><span className="person-avatar">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div>
            <div className="access-badges"><span className={`status-badge ${user.active ? "status-approved" : "status-rejected"}`}>{user.active ? "active" : "inactive"}</span><span className={`status-badge ${linkedToCognito ? "status-cleared" : "status-neutral"}`}>{linkedToCognito ? "Cognito linked" : "pending login"}</span><span className="status-badge status-neutral">{title(user.role)}</span></div>
            <form className="access-edit-form" action={updateAppUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <label>Name<input name="name" defaultValue={user.name} required /></label>
              <label>Email<input name="email" type="email" defaultValue={user.email} required /></label>
              <label>Role<select name="role" defaultValue={user.role}>{accessRoles.map((role) => <option value={role} key={role}>{title(role)}</option>)}</select></label>
              <label>Employee profile<select name="employeeId" defaultValue={user.employeeId ?? ""}><option value="">Not linked</option>{employeeOptions.map((employee) => <option value={employee.id} key={employee.id}>{employeeLabel(employee)}</option>)}</select></label>
              <button className="button button-secondary" type="submit">Save</button>
            </form>
            <form action={user.active ? deactivateAppUserAction : reactivateAppUserAction} className="access-status-form">
              <input type="hidden" name="userId" value={user.id} />
              <button className={`button ${user.active ? "button-danger" : "button-primary"}`} type="submit" disabled={user.id === currentUser.id}>{user.active ? "Deactivate" : "Reactivate"}</button>
            </form>
          </article>;
        })}
      </div>
      <form className="settings-form access-create-form" action={createAppUserAction}>
        <h3>Add app user</h3>
        <div className="settings-form-grid access-create-grid">
          <label>Name<input name="name" required placeholder="Jordan Smith" /></label>
          <label>Email<input name="email" type="email" required placeholder="person@kadrissupport.com" /></label>
          <label>Role<select name="role" defaultValue="EMPLOYEE">{accessRoles.map((role) => <option value={role} key={role}>{title(role)}</option>)}</select></label>
          <label>Employee profile<select name="employeeId" defaultValue=""><option value="">Not linked</option>{accessData.employees.filter((employee) => !employee.user).map((employee) => <option value={employee.id} key={employee.id}>{employeeLabel(employee)}</option>)}</select></label>
        </div>
        <button className="button button-primary" type="submit">Add user</button>
      </form>
    </section>}

    {selectedRole && <section className="panel role-rules-panel"><div className="panel-heading"><div><h2>{selectedRole.name} rules</h2><p>These requirements are assigned automatically when an employee is created in this role.</p></div></div>
      <div className="role-rule-list">
        {selectedRole.requirements.length === 0 ? <div className="empty-state compact"><strong>No requirements assigned</strong><p>Add a requirement below to start enforcing this role.</p></div> : selectedRole.requirements.map((mapping) => <article className="role-rule-row" key={mapping.id}><span><strong>{mapping.requirement.name}</strong><small>{title(mapping.requirement.requirementType)} · {mapping.requiredBeforeWork ? "required before work" : "post-hire"}{mapping.conditionKey ? ` · ${CONDITION_OPTIONS.find((option) => option.value === mapping.conditionKey)?.label}` : ""}</small></span><span className={`status-badge ${mapping.requirement.expires ? "status-expiring-soon" : "status-neutral"}`}>{mapping.requirement.expires ? "expires" : "no expiration"}</span><form action={removeRoleRequirementAction}><input type="hidden" name="mappingId" value={mapping.id} /><button className="button button-secondary" type="submit">Remove</button></form></article>)}
      </div>
      <form className="assign-form" action={upsertRoleRequirementAction}>
        <input type="hidden" name="jobRoleId" value={selectedRole.id} />
        <label>Requirement<select name="requirementId" required>{assignableRequirements.length === 0 ? <option value="">All active requirements are assigned</option> : assignableRequirements.map((requirement) => <option value={requirement.id} key={requirement.id}>{requirement.name}</option>)}</select></label>
        <label>Condition<select name="conditionKey" defaultValue="">{CONDITION_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
        <label className="checkbox-inline"><input name="requiredBeforeWork" type="checkbox" defaultChecked /> Required before work</label>
        <button className="button button-primary" type="submit" disabled={assignableRequirements.length === 0}>Assign requirement</button>
      </form>
    </section>}
  </main>;
}
