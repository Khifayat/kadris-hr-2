"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "../../generated/prisma/client";
import { completeFirstAccessTutorialAction } from "@/app/(protected)/tutorial-actions";

export function FirstAccessTutorial({ role }: { role: UserRole }) {
  const canAdminister = role === "OWNER_ADMIN" || role === "ADMIN";
  const isEmployee = role === "EMPLOYEE";
  const router = useRouter();
  const steps = isEmployee
    ? [
        { title: "Your task workspace", body: "Start with My Tasks to see what evidence you need to submit and what HR has already approved.", href: "/my-requirements", action: "Open My Tasks" },
        { title: "Stay ahead of deadlines", body: "Reminders surface tasks that are missing, pending review, expiring, or expired.", href: "/reminders", action: "Open reminders" },
        { title: "Keep your account current", body: "Use the profile control in the header to update your display name and contact email.", href: "/profile", action: "Open profile" },
      ]
    : [
        { title: "Start with the dashboard", body: "Use the dashboard to see onboarding, clearance, and review work that needs attention now.", href: "/dashboard", action: "Open dashboard" },
        { title: "Work from each employee profile", body: "Employee profiles keep compliance tasks, documents, access, and activity organized in focused tabs.", href: "/employees", action: "Open employees" },
        { title: canAdminister ? "Configure with confidence" : "Stay ahead with reminders", body: canAdminister ? "Settings is where you manage tasks, role rules, and app users. Owner accounts remain protected." : "The reminder queue highlights missing, expiring, and pending work before it blocks clearance.", href: canAdminister ? "/settings" : "/reminders", action: canAdminister ? "Open settings" : "Open reminders" },
      ];
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLastStep = step === steps.length - 1;

  return <aside className="tutorial-guide" aria-labelledby="tutorial-title" aria-live="polite">
    <div className="tutorial-guide-topline"><span>Getting started</span><span>Step {step + 1} of {steps.length}</span></div>
    <div className="tutorial-progress" aria-hidden><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
    <h2 id="tutorial-title">{current.title}</h2>
    <p>{current.body}</p>
    <button className="tutorial-open-link" type="button" onClick={() => router.push(current.href)}>{current.action} <span aria-hidden>→</span></button>
    <div className="tutorial-guide-actions">
      {step > 0 ? <button className="button button-secondary" type="button" onClick={() => setStep((value) => value - 1)}>Back</button> : <span />}
      {isLastStep ? <form action={completeFirstAccessTutorialAction}><button className="button button-primary" type="submit">Finish tutorial</button></form> : <button className="button button-primary" type="button" onClick={() => setStep((value) => value + 1)}>Next</button>}
    </div>
  </aside>;
}
