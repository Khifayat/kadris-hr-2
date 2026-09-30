import "server-only";

import { prisma } from "../db/prisma";
import { refreshEmployeeClearance } from "../compliance/refresh";
import { getDocumentObject, putDocumentObject } from "./storage";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

function cleanFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned || "document";
}

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Expiration date is invalid.");
  return parsed;
}

function requireText(value: FormDataEntryValue | null, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} is required.`);
  return value.trim();
}

async function storeUpload(
  file: File,
  context: { employeeNumber: string; requirementName: string },
): Promise<{ key: string; fileName: string; mimeType: string; sizeBytes: number }> {
  if (file.size <= 0) throw new Error("Choose a document to upload.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Documents must be 10 MB or smaller.");
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Upload a PDF, image, or text document.");
  }

  const fileName = cleanFileName(file.name);
  const stored = await putDocumentObject({
    bytes: Buffer.from(await file.arrayBuffer()),
    fileName,
    keySegments: [context.employeeNumber, context.requirementName],
    mimeType: file.type,
  });
  return { key: stored.key, fileName, mimeType: file.type, sizeBytes: file.size };
}

export async function submitRequirementDocument(formData: FormData, actorId: string): Promise<string> {
  const employeeId = requireText(formData.get("employeeId"), "Employee");
  return submitRequirementDocumentForEmployee(formData, actorId, employeeId);
}

export async function submitRequirementDocumentForEmployee(
  formData: FormData,
  actorId: string,
  employeeId: string,
): Promise<string> {
  const employeeRequirementId = requireText(formData.get("employeeRequirementId"), "Requirement");
  const expirationDate = parseOptionalDate(formData.get("expirationDate"));
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Choose a document to upload.");

  const assignment = await prisma.employeeRequirement.findFirst({
    where: {
      id: employeeRequirementId,
      employeeId,
      active: true,
    },
    include: {
      employee: { select: { employeeNumber: true } },
      requirement: { select: { name: true, expires: true } },
    },
  });
  if (!assignment) throw new Error("Requirement not found.");
  if (assignment.expires && !expirationDate) throw new Error("Expiration date is required for this document.");

  const stored = await storeUpload(file, {
    employeeNumber: assignment.employee.employeeNumber,
    requirementName: assignment.requirement.name,
  });

  await prisma.$transaction(async (tx) => {
    const currentAssignment = await tx.employeeRequirement.findFirst({
      where: {
        id: employeeRequirementId,
        employeeId,
        active: true,
      },
      include: { requirement: { select: { name: true, expires: true } } },
    });
    if (!currentAssignment) throw new Error("Requirement not found.");
    if (currentAssignment.expires && !expirationDate) throw new Error("Expiration date is required for this document.");

    await tx.document.create({
      data: {
        employeeId,
        employeeRequirementId,
        fileName: stored.fileName,
        storageKey: stored.key,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        documentType: currentAssignment.requirement.name,
        uploadedByUserId: actorId,
      },
    });

    await tx.employeeRequirement.update({
      where: { id: employeeRequirementId },
      data: {
        status: "PENDING_REVIEW",
        expirationDate,
        completedDate: new Date(),
        rejectedByUserId: null,
        rejectedAt: null,
        rejectionReason: null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        employeeId,
        action: "DOCUMENT_SUBMITTED",
        entityType: "EmployeeRequirement",
        entityId: employeeRequirementId,
        newValue: { requirementName: currentAssignment.requirement.name, fileName: stored.fileName, expirationDate },
      },
    });

    await refreshEmployeeClearance(tx, employeeId, actorId);
  });

  return employeeId;
}

export async function approveRequirement(employeeRequirementId: string, actorId: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.employeeRequirement.findUnique({
      where: { id: employeeRequirementId },
      include: { requirement: { select: { name: true } } },
    });
    if (!assignment) throw new Error("Requirement not found.");
    if (assignment.status !== "PENDING_REVIEW") throw new Error("Only pending requirements can be approved.");
    if (assignment.expires && !assignment.expirationDate) throw new Error("Expiration date is required before approval.");

    await tx.employeeRequirement.update({
      where: { id: employeeRequirementId },
      data: {
        status: "APPROVED",
        approvedByUserId: actorId,
        approvedAt: new Date(),
        rejectedByUserId: null,
        rejectedAt: null,
        rejectionReason: null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        employeeId: assignment.employeeId,
        action: "REQUIREMENT_APPROVED",
        entityType: "EmployeeRequirement",
        entityId: assignment.id,
        newValue: { requirementName: assignment.requirement.name },
      },
    });

    await refreshEmployeeClearance(tx, assignment.employeeId, actorId);
    return assignment.employeeId;
  });
}

export async function rejectRequirement(formData: FormData, actorId: string): Promise<string> {
  const employeeRequirementId = requireText(formData.get("employeeRequirementId"), "Requirement");
  const rejectionReason = requireText(formData.get("rejectionReason"), "Rejection reason");

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.employeeRequirement.findUnique({
      where: { id: employeeRequirementId },
      include: { requirement: { select: { name: true } } },
    });
    if (!assignment) throw new Error("Requirement not found.");
    if (assignment.status !== "PENDING_REVIEW") throw new Error("Only pending requirements can be rejected.");

    await tx.employeeRequirement.update({
      where: { id: employeeRequirementId },
      data: {
        status: "REJECTED",
        rejectedByUserId: actorId,
        rejectedAt: new Date(),
        rejectionReason,
        approvedByUserId: null,
        approvedAt: null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        employeeId: assignment.employeeId,
        action: "REQUIREMENT_REJECTED",
        entityType: "EmployeeRequirement",
        entityId: assignment.id,
        newValue: { requirementName: assignment.requirement.name, rejectionReason },
      },
    });

    await refreshEmployeeClearance(tx, assignment.employeeId, actorId);
    return assignment.employeeId;
  });
}

export async function readActiveDocument(documentId: string) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, status: "ACTIVE" },
    select: { employeeId: true, fileName: true, storageKey: true, mimeType: true, sizeBytes: true },
  });
  if (!document) return null;

  const object = await getDocumentObject(document.storageKey);
  return { ...document, file: object.bytes };
}
