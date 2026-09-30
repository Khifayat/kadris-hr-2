import Link from "next/link";
import { CreateEmployeeForm } from "@/components/employees/create-employee-form";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeFormOptions } from "@/lib/employees/queries";
import { HR_WRITE_ROLES } from "@/lib/permissions/roles";

export default async function NewEmployeePage() {
  await requireRole(HR_WRITE_ROLES);
  const options = await getEmployeeFormOptions();
  return <main className="page-wrap narrow"><Link className="back-link" href="/employees">← Back to employees</Link><div className="page-heading"><div><p className="eyebrow">New hire</p><h1>Add an employee</h1><p>Create the employment record and generate their role-based compliance checklist.</p></div></div><CreateEmployeeForm roles={options.roles} supervisors={options.supervisors} /></main>;
}
