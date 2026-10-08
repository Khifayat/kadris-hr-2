"use client";

import { useFormStatus } from "react-dom";
import { deleteEmployeeAction } from "@/app/(protected)/employees/[id]/actions";

function DeleteButton() {
  const { pending } = useFormStatus();
  return <button className="button button-danger" disabled={pending} type="submit">{pending ? "Deleting…" : "Delete employee"}</button>;
}

export function DeleteEmployeeForm({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  return <form
    action={deleteEmployeeAction}
    className="delete-employee-form"
    onSubmit={(event) => {
      if (!window.confirm(`Permanently delete ${employeeName}? Their profile, compliance records, and documents will be removed, and their app access will be disabled.`)) {
        event.preventDefault();
      }
    }}
  >
    <input name="employeeId" type="hidden" value={employeeId} />
    <DeleteButton />
  </form>;
}
