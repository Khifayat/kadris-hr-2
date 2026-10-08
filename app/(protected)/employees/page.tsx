import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { listEmployees } from "@/lib/employees/queries";
import { HR_READ_ROLES } from "@/lib/permissions/roles";

const filters = ["ALL", "ACTIVE", "ONBOARDING", "NOT_CLEARED", "TERMINATED"];

export default async function EmployeesPage({ searchParams }: PageProps<"/employees">) {
  await requireRole(HR_READ_ROLES);
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "ALL";
  const deleted = params.deleted === "1";
  const employees = await listEmployees(query, status);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return (
    <main className="page-wrap">
      <div className="page-heading"><div><p className="eyebrow">People</p><h1>Employees</h1><p>Manage onboarding, roles, and compliance readiness.</p></div><Link className="button button-primary" href="/employees/new">+ Add employee</Link></div>
      {deleted && <section className="success-banner" role="status"><strong>Employee deleted</strong><span>The employee profile was removed and linked app access was disabled.</span></section>}
      <section className="panel employee-directory">
        <form className="directory-tools">
          <label className="search-box"><span>⌕</span><input defaultValue={query} name="q" placeholder="Search by name, email, or employee ID" /></label>
          <input type="hidden" name="status" value={status} />
          <button className="button button-secondary" type="submit">Search</button>
        </form>
        <div className="filter-tabs">
          {filters.map((filter) => <Link className={filter === status ? "active" : ""} href={`/employees?status=${filter}${query ? `&q=${encodeURIComponent(query)}` : ""}`} key={filter}>{filter === "ALL" ? "All" : filter.replaceAll("_", " ").toLowerCase()}</Link>)}
        </div>
        <div className="employee-table" role="table" aria-label="Employees">
          <div className="table-row table-head" role="row"><span>Employee</span><span>Role</span><span>Lifecycle</span><span>Compliance</span><span>Clearance</span><span /></div>
          {employees.map((employee) => {
            const applicable = employee.requirements.filter((item) => !item.conditional || item.conditionSatisfied);
            const approved = applicable.filter((item) => item.status === "APPROVED" && (!item.expirationDate || item.expirationDate >= today)).length;
            const completion = applicable.length ? Math.round((approved / applicable.length) * 100) : 0;
            return <Link className="table-row" href={`/employees/${employee.id}`} role="row" key={employee.id}>
              <span className="employee-name"><span className="person-avatar">{employee.firstName[0]}{employee.lastName[0]}</span><span><strong>{employee.firstName} {employee.lastName}</strong><small>{employee.employeeNumber} · {employee.email}</small></span></span>
              <span><strong>{employee.jobRole.name}</strong><small>{employee.jobRole.department}</small></span>
              <span><span className="status-badge status-neutral">{employee.status.toLowerCase()}</span></span>
              <span className="completion"><strong>{completion}%</strong><span><i style={{ width: `${completion}%` }} /></span></span>
              <span><span className={`status-badge ${employee.clearanceStatus === "CLEARED" ? "status-cleared" : "status-not-cleared"}`}>{employee.clearanceStatus === "CLEARED" ? "Cleared" : "Not cleared"}</span></span>
              <span className="row-arrow">›</span>
            </Link>;
          })}
          {employees.length === 0 && <div className="empty-state"><strong>No employees found</strong><p>Try a different search or filter.</p></div>}
        </div>
      </section>
    </main>
  );
}
