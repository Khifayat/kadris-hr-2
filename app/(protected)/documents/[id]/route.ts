import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { readActiveDocument } from "@/lib/documents/service";
import { canReadHrWorkspace } from "@/lib/permissions/roles";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const document = await readActiveDocument(id);
  if (!document) notFound();
  if (!canReadHrWorkspace(user.role) && document.employeeId !== user.employeeId) notFound();

  return new Response(new Uint8Array(document.file), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Length": String(document.sizeBytes),
      "Content-Disposition": `attachment; filename="${document.fileName.replaceAll('"', "")}"`,
    },
  });
}
