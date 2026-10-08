"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createEmployeeAction, type CreateEmployeeState } from "@/app/(protected)/employees/new/actions";

type Option = { id: string; name: string };
type Supervisor = { id: string; firstName: string; lastName: string; jobRole: { name: string } };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="button button-primary" disabled={pending} type="submit">{pending ? "Creating employee…" : "Create employee"}</button>;
}

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <small className="field-error">{errors[0]}</small> : null;
}

export function CreateEmployeeForm({ roles, supervisors }: { roles: Option[]; supervisors: Supervisor[] }) {
  const initialState: CreateEmployeeState = {};
  const [state, action] = useActionState(createEmployeeAction, initialState);

  return (
    <form action={action} className="employee-form">
      {state.error && <div className="form-alert" role="alert">{state.error}</div>}
      <section className="form-section"><div className="form-section-copy"><span>01</span><div><h2>Personal details</h2><p>Basic contact and identification information.</p></div></div><div className="form-grid">
        <label>First name<input name="firstName" required /><FieldError errors={state.fieldErrors?.firstName} /></label>
        <label>Last name<input name="lastName" required /><FieldError errors={state.fieldErrors?.lastName} /></label>
        <label>Work email<input name="email" type="email" required /><FieldError errors={state.fieldErrors?.email} /></label>
        <label>Phone number<input name="phone" type="tel" /></label>
        <label>Employee number<input name="employeeNumber" placeholder="KSS-1003" required /><FieldError errors={state.fieldErrors?.employeeNumber} /></label>
      </div></section>
      <section className="form-section"><div className="form-section-copy"><span>02</span><div><h2>Employment</h2><p>Role selection generates the compliance checklist.</p></div></div><div className="form-grid">
        <label>Job role<select name="jobRoleId" required defaultValue=""><option value="" disabled>Select a role</option>{roles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select><FieldError errors={state.fieldErrors?.jobRoleId} /></label>
        <label>Supervisor<select name="supervisorId" defaultValue=""><option value="">No supervisor assigned</option>{supervisors.map((person) => <option value={person.id} key={person.id}>{person.firstName} {person.lastName} — {person.jobRole.name}</option>)}</select></label>
        <label>Hire date<input name="hireDate" type="date" required /><FieldError errors={state.fieldErrors?.hireDate} /></label>
        <label>Employment type<select name="employmentType" defaultValue="FULL_TIME"><option value="FULL_TIME">Full time</option><option value="PART_TIME">Part time</option><option value="PRN">PRN</option><option value="CONTRACTOR">Contractor</option><option value="TEMPORARY">Temporary</option></select></label>
      </div></section>
      <section className="form-section"><div className="form-section-copy"><span>03</span><div><h2>Job duties</h2><p>These answers activate conditional tasks.</p></div></div><div className="duty-options">
        <label className="checkbox-card"><input name="transportsParticipants" type="checkbox" /><span><strong>Transports participants</strong><small>Requires a driver&apos;s license and auto insurance.</small></span></label>
        <label className="checkbox-card"><input name="performsMedicationDuties" type="checkbox" /><span><strong>Performs medication duties</strong><small>Requires Medication Technician certification when mapped to the role.</small></span></label>
      </div></section>
      <section className="form-section"><div className="form-section-copy"><span>04</span><div><h2>App access</h2><p>Create their Kadris HR account and let Cognito email first-login instructions.</p></div></div><div className="duty-options">
        <label className="checkbox-card"><input name="sendInvitation" type="checkbox" defaultChecked /><span><strong>Send account invitation</strong><small>The employee will receive a temporary password and create a new password at first sign-in.</small></span></label>
      </div></section>
      <div className="form-actions"><Link className="button button-secondary" href="/employees">Cancel</Link><SubmitButton /></div>
    </form>
  );
}
