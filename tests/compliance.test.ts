import { describe, expect, it } from "vitest";
import {
  calculateEmployeeClearance,
  canEmployeeWork,
  categorizeExpiration,
  getExpiredRequirements,
  getExpiringRequirements,
  getMissingRequirements,
  isConditionSatisfied,
  type ComplianceRequirement,
} from "../lib/compliance";
import { buildRequirementReminders } from "../lib/reminders/rules";
import type { ReminderRequirement } from "../lib/reminders/types";

const now = new Date("2026-09-29T15:00:00.000Z");

function requirement(
  overrides: Partial<ComplianceRequirement> = {},
): ComplianceRequirement {
  return {
    id: "req-1",
    name: "CPR",
    status: "APPROVED",
    active: true,
    requiredBeforeWork: true,
    conditional: false,
    conditionSatisfied: true,
    expires: false,
    expirationDate: null,
    reminderDays: [60, 30, 7],
    ...overrides,
  };
}

function reminderRequirement(
  overrides: Partial<ReminderRequirement> = {},
): ReminderRequirement {
  return {
    ...requirement(),
    ...overrides,
  };
}

describe("calculateEmployeeClearance", () => {
  it("clears an employee only when every applicable pre-work requirement is approved", () => {
    const result = calculateEmployeeClearance(
      [requirement(), requirement({ id: "req-2", name: "I-9" })],
      now,
    );
    expect(result).toMatchObject({ cleared: true, status: "CLEARED", reasons: [] });
  });

  it("returns actionable reasons for every blocker", () => {
    const result = calculateEmployeeClearance(
      [
        requirement({ status: "NOT_STARTED", name: "Auto Insurance" }),
        requirement({ id: "req-2", status: "PENDING_REVIEW", name: "Background Check" }),
        requirement({ id: "req-3", status: "REJECTED", name: "I-9" }),
      ],
      now,
    );
    expect(result.reasons.map(({ requirement, reason }) => ({ requirement, reason }))).toEqual([
      { requirement: "Auto Insurance", reason: "MISSING" },
      { requirement: "Background Check", reason: "PENDING_REVIEW" },
      { requirement: "I-9", reason: "REJECTED" },
    ]);
  });

  it("derives expiration from the date even if the stored status is still approved", () => {
    const expired = requirement({
      expires: true,
      expirationDate: new Date("2026-09-28T00:00:00.000Z"),
    });
    expect(calculateEmployeeClearance([expired], now).reasons[0]?.reason).toBe("EXPIRED");
    expect(canEmployeeWork([expired], now)).toBe(false);
  });

  it("fails closed when a role has no applicable pre-work requirements", () => {
    const result = calculateEmployeeClearance([], now);
    expect(result.cleared).toBe(false);
    expect(result.reasons[0]?.reason).toBe("NO_REQUIRED_REQUIREMENTS");
  });

  it("ignores inactive, non-blocking, and unmet conditional assignments", () => {
    const result = calculateEmployeeClearance(
      [
        requirement(),
        requirement({ id: "inactive", status: "REJECTED", active: false }),
        requirement({ id: "later", status: "NOT_STARTED", requiredBeforeWork: false }),
        requirement({
          id: "driver",
          status: "NOT_STARTED",
          conditional: true,
          conditionSatisfied: false,
        }),
      ],
      now,
    );
    expect(result.cleared).toBe(true);
  });

  it("blocks expiring credentials that lack an expiration date", () => {
    const result = calculateEmployeeClearance([requirement({ expires: true })], now);
    expect(result.reasons[0]?.reason).toBe("MISSING_EXPIRATION");
  });
});

describe("expiration", () => {
  it("treats a credential as valid through the expiration date", () => {
    expect(categorizeExpiration(new Date("2026-09-29T00:00:00.000Z"), [60], now)).toEqual({
      category: "EXPIRING_SOON",
      daysRemaining: 0,
      nextReminderDay: null,
    });
  });

  it("categorizes valid, expiring, and expired dates", () => {
    expect(categorizeExpiration(new Date("2027-01-01"), [60], now).category).toBe("VALID");
    expect(categorizeExpiration(new Date("2026-10-20"), [60, 30, 7], now).category).toBe(
      "EXPIRING_SOON",
    );
    expect(categorizeExpiration(new Date("2026-09-28"), [60], now).category).toBe("EXPIRED");
  });
});

describe("compliance queries", () => {
  const requirements = [
    requirement({ id: "missing", status: "NOT_STARTED" }),
    requirement({ id: "expired", expires: true, expirationDate: new Date("2026-09-28") }),
    requirement({ id: "soon", expires: true, expirationDate: new Date("2026-10-20") }),
  ];

  it("returns missing requirements", () => {
    expect(getMissingRequirements(requirements).map(({ id }) => id)).toEqual(["missing"]);
  });

  it("returns expired requirements", () => {
    expect(getExpiredRequirements(requirements, now).map(({ id }) => id)).toEqual(["expired"]);
  });

  it("returns approved requirements inside their configured reminder window", () => {
    expect(getExpiringRequirements(requirements, now).map(({ id }) => id)).toEqual(["soon"]);
  });
});

describe("conditional applicability", () => {
  const facts = { transportsParticipants: true, performsMedicationDuties: false };

  it("activates known conditions from employee duty facts", () => {
    expect(isConditionSatisfied(true, "TRANSPORTS_PARTICIPANTS", facts)).toBe(true);
    expect(isConditionSatisfied(true, "PERFORMS_MEDICATION_DUTIES", facts)).toBe(false);
  });

  it("fails closed for unknown condition keys", () => {
    expect(isConditionSatisfied(true, "UNKNOWN_FUTURE_CONDITION", facts)).toBe(false);
  });

  it("always applies unconditional requirements", () => {
    expect(isConditionSatisfied(false, null, facts)).toBe(true);
  });
});

describe("reminder rules", () => {
  it("creates employee-action reminders for missing and rejected requirements", () => {
    expect(buildRequirementReminders(reminderRequirement({ status: "NOT_STARTED" }), now)[0]).toMatchObject({
      audience: "EMPLOYEE",
      kind: "MISSING_DOCUMENT",
      priority: "HIGH",
    });
    expect(buildRequirementReminders(reminderRequirement({ status: "REJECTED", rejectionReason: "Blurry upload" }), now)[0]).toMatchObject({
      audience: "EMPLOYEE",
      kind: "REJECTED_DOCUMENT",
      detail: "Blurry upload",
    });
  });

  it("creates HR review reminders for pending requirements", () => {
    expect(buildRequirementReminders(reminderRequirement({ status: "PENDING_REVIEW" }), now)[0]).toMatchObject({
      audience: "HR",
      kind: "PENDING_REVIEW",
      priority: "HIGH",
    });
  });

  it("creates expiration reminders with urgency from days remaining", () => {
    expect(buildRequirementReminders(reminderRequirement({
      expires: true,
      expirationDate: new Date("2026-10-04"),
    }), now)[0]).toMatchObject({
      kind: "EXPIRING_DOCUMENT",
      priority: "HIGH",
      daysRemaining: 5,
    });
    expect(buildRequirementReminders(reminderRequirement({
      expires: true,
      expirationDate: new Date("2026-09-28"),
    }), now)[0]).toMatchObject({
      kind: "EXPIRED_DOCUMENT",
      priority: "CRITICAL",
    });
  });

  it("does not remind for inactive or unsatisfied conditional requirements", () => {
    expect(buildRequirementReminders(reminderRequirement({ active: false, status: "NOT_STARTED" }), now)).toEqual([]);
    expect(buildRequirementReminders(reminderRequirement({
      conditional: true,
      conditionSatisfied: false,
      status: "NOT_STARTED",
    }), now)).toEqual([]);
  });
});
