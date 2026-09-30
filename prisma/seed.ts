import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  EmploymentType,
  EmployeeStatus,
  PrismaClient,
  RequirementStatus,
  RequirementType,
  UserRole,
} from "../generated/prisma/client";
import { calculateEmployeeClearance } from "../lib/compliance/clearance";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the database");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const requirementDefinitions = [
  { name: "Employment Application", requirementType: RequirementType.DOCUMENT, expires: false },
  { name: "I-9", requirementType: RequirementType.DOCUMENT, expires: false },
  { name: "W-4", requirementType: RequirementType.DOCUMENT, expires: false },
  { name: "Background Check", requirementType: RequirementType.BACKGROUND_CHECK, expires: false },
  { name: "CPR", requirementType: RequirementType.CERTIFICATION, expires: true, expirationPeriodDays: 730 },
  { name: "First Aid", requirementType: RequirementType.CERTIFICATION, expires: true, expirationPeriodDays: 730 },
  { name: "DDA Orientation", requirementType: RequirementType.TRAINING, expires: false },
  { name: "Driver's License", requirementType: RequirementType.DOCUMENT, expires: true },
  { name: "Auto Insurance", requirementType: RequirementType.DOCUMENT, expires: true },
  { name: "Medication Technician Certification", requirementType: RequirementType.CERTIFICATION, expires: true, expirationPeriodDays: 730 },
  { name: "Abuse/Neglect Reporting", requirementType: RequirementType.TRAINING, expires: false },
  { name: "Incident Reporting", requirementType: RequirementType.TRAINING, expires: false },
  { name: "HIPAA/Confidentiality", requirementType: RequirementType.TRAINING, expires: false },
  { name: "Person-Centered Planning", requirementType: RequirementType.TRAINING, expires: false },
  { name: "Employee Handbook", requirementType: RequirementType.ACKNOWLEDGEMENT, expires: false },
] as const;

const roleDefinitions = [
  { name: "Direct Support Professional", department: "Direct Care" },
  { name: "Program Manager", department: "Programs" },
  { name: "Residential Staff", department: "Residential" },
  { name: "Nurse", department: "Clinical" },
  { name: "Office / Administrative", department: "Administration" },
  { name: "Other", department: "Other" },
] as const;

const universalRequirements = [
  "Employment Application",
  "I-9",
  "W-4",
  "Background Check",
  "Abuse/Neglect Reporting",
  "HIPAA/Confidentiality",
  "Employee Handbook",
];

const requirementsByRole: Record<string, string[]> = {
  "Direct Support Professional": ["CPR", "First Aid", "DDA Orientation", "Incident Reporting", "Person-Centered Planning", "Driver's License", "Auto Insurance"],
  "Program Manager": ["CPR", "First Aid", "DDA Orientation", "Incident Reporting", "Person-Centered Planning", "Driver's License", "Auto Insurance"],
  "Residential Staff": ["CPR", "First Aid", "DDA Orientation", "Incident Reporting", "Person-Centered Planning", "Medication Technician Certification"],
  Nurse: ["CPR", "First Aid", "DDA Orientation", "Incident Reporting", "Person-Centered Planning", "Medication Technician Certification"],
  "Office / Administrative": [],
  Other: [],
};

async function assignRequirements(
  employeeId: string,
  jobRoleId: string,
  approvedNames: Set<string>,
  satisfiedConditions: Set<string>,
  approverId: string,
) {
  const mappings = await prisma.jobRoleRequirement.findMany({
    where: { jobRoleId, active: true },
    include: { requirement: true },
  });

  for (const mapping of mappings) {
    const conditionSatisfied =
      !mapping.conditional || satisfiedConditions.has(mapping.requirement.name);
    const approved = approvedNames.has(mapping.requirement.name) && conditionSatisfied;
    const assignment = {
      requiredBeforeWork: mapping.requiredBeforeWork,
      conditional: mapping.conditional,
      conditionSatisfied,
      requiresApproval: mapping.requirement.requiresApproval,
      expires: mapping.requirement.expires,
      reminderDays: mapping.requirement.reminderDays,
      status: approved ? RequirementStatus.APPROVED : RequirementStatus.NOT_STARTED,
      completedDate: approved ? new Date("2026-08-15") : null,
      expirationDate:
        approved && mapping.requirement.expires ? new Date("2027-08-15") : null,
      approvedByUserId: approved ? approverId : null,
      approvedAt: approved ? new Date("2026-08-15T15:00:00.000Z") : null,
    };
    await prisma.employeeRequirement.upsert({
      where: {
        employeeId_requirementId: { employeeId, requirementId: mapping.requirementId },
      },
      update: assignment,
      create: {
        employeeId,
        requirementId: mapping.requirementId,
        ...assignment,
      },
    });
  }
}

async function refreshClearance(employeeId: string, actorId: string) {
  const assignments = await prisma.employeeRequirement.findMany({
    where: { employeeId },
    include: { requirement: { select: { name: true } } },
  });
  const now = new Date("2026-09-29T15:00:00.000Z");
  const result = calculateEmployeeClearance(
    assignments.map((item) => ({
      id: item.id,
      name: item.requirement.name,
      status: item.status,
      active: item.active,
      requiredBeforeWork: item.requiredBeforeWork,
      conditional: item.conditional,
      conditionSatisfied: item.conditionSatisfied,
      expires: item.expires,
      expirationDate: item.expirationDate,
      reminderDays: item.reminderDays,
    })),
    now,
  );

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      clearanceStatus: result.status,
      clearanceCalculatedAt: now,
      clearedAt: result.cleared ? now : null,
    },
  });
  await prisma.clearanceEvent.upsert({
    where: { id: `seed-clearance-${employeeId}` },
    update: { toStatus: result.status, reasons: result.reasons, triggeredByUserId: actorId },
    create: {
      id: `seed-clearance-${employeeId}`,
      employeeId,
      toStatus: result.status,
      reasons: result.reasons,
      triggeredByUserId: actorId,
      createdAt: now,
    },
  });
}

async function main() {
  const requirementIds = new Map<string, string>();
  for (const definition of requirementDefinitions) {
    const requirement = await prisma.requirement.upsert({
      where: { name: definition.name },
      update: { ...definition, active: true },
      create: {
        ...definition,
        requiresApproval: true,
        active: true,
        reminderDays: [60, 30, 7],
      },
    });
    requirementIds.set(requirement.name, requirement.id);
  }

  const roleIds = new Map<string, string>();
  for (const definition of roleDefinitions) {
    const role = await prisma.jobRole.upsert({
      where: { name: definition.name },
      update: { ...definition, active: true },
      create: { ...definition, active: true },
    });
    roleIds.set(role.name, role.id);

    for (const requirementName of [
      ...universalRequirements,
      ...requirementsByRole[role.name],
    ]) {
      const requirementId = requirementIds.get(requirementName);
      if (!requirementId) throw new Error(`Unknown seed requirement: ${requirementName}`);
      const conditional = ["Driver's License", "Auto Insurance", "Medication Technician Certification"].includes(requirementName);
      const conditionKey = conditional
        ? requirementName === "Medication Technician Certification"
          ? "PERFORMS_MEDICATION_DUTIES"
          : "TRANSPORTS_PARTICIPANTS"
        : null;
      await prisma.jobRoleRequirement.upsert({
        where: { jobRoleId_requirementId: { jobRoleId: role.id, requirementId } },
        update: { active: true, conditionKey },
        create: {
          jobRoleId: role.id,
          requirementId,
          requiredBeforeWork: true,
          conditional,
          conditionKey,
          conditionDescription: conditional
            ? requirementName === "Medication Technician Certification"
              ? "Required when the employee performs medication-related duties"
              : "Required when the employee transports participants"
            : null,
        },
      });
    }
  }

  const dspRoleId = roleIds.get("Direct Support Professional");
  const managerRoleId = roleIds.get("Program Manager");
  if (!dspRoleId || !managerRoleId) throw new Error("Required seed roles were not created");

  const owner = await prisma.user.upsert({
    where: { email: "owner@kadrissupport.example" },
    update: {},
    create: {
      authProviderId: "development|owner",
      email: "owner@kadrissupport.example",
      name: "Kadris Owner",
      role: UserRole.OWNER_ADMIN,
    },
  });

  const manager = await prisma.employee.upsert({
    where: { employeeNumber: "KSS-1001" },
    update: { transportsParticipants: false, performsMedicationDuties: false },
    create: {
      employeeNumber: "KSS-1001",
      firstName: "Denise",
      lastName: "Moore",
      email: "denise.moore@kadrissupport.example",
      status: EmployeeStatus.ACTIVE,
      jobRoleId: managerRoleId,
      hireDate: new Date("2025-02-10"),
      employmentType: EmploymentType.FULL_TIME,
      transportsParticipants: false,
    },
  });

  const ashley = await prisma.employee.upsert({
    where: { employeeNumber: "KSS-1002" },
    update: {
      supervisorId: manager.id,
      transportsParticipants: true,
      performsMedicationDuties: false,
    },
    create: {
      employeeNumber: "KSS-1002",
      firstName: "Ashley",
      lastName: "Johnson",
      email: "ashley.johnson@kadrissupport.example",
      jobRoleId: dspRoleId,
      supervisorId: manager.id,
      hireDate: new Date("2026-09-15"),
      employmentType: EmploymentType.FULL_TIME,
      transportsParticipants: true,
    },
  });

  const approved = new Set(universalRequirements.concat(["CPR", "First Aid", "DDA Orientation", "Incident Reporting", "Person-Centered Planning"]));
  await assignRequirements(manager.id, managerRoleId, approved, new Set(), owner.id);
  await assignRequirements(
    ashley.id,
    dspRoleId,
    approved,
    new Set(["Driver's License", "Auto Insurance"]),
    owner.id,
  );
  await refreshClearance(manager.id, owner.id);
  await refreshClearance(ashley.id, owner.id);

  await prisma.auditLog.upsert({
    where: { id: "seed-ashley-created" },
    update: {},
    create: {
      id: "seed-ashley-created",
      actorId: owner.id,
      employeeId: ashley.id,
      action: "SEED_DATA_CREATED",
      entityType: "Employee",
      entityId: ashley.id,
      newValue: { source: "prisma/seed.ts" },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
