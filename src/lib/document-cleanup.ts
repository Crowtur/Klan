import { prisma } from "@/lib/prisma";
import { deleteUploadThingFile } from "@/lib/uploadthing-server";

export async function removeQueuedFile(fileKey: string) {
  try {
    await deleteUploadThingFile(fileKey);
    await prisma.pendingFileDeletion.deleteMany({ where: { fileKey } });
    return true;
  } catch {
    // Rotate failed entries so a persistent provider error cannot starve later withdrawals.
    await prisma.pendingFileDeletion.updateMany({ where: { fileKey }, data: { queuedAt: new Date() } });
    return false;
  }
}

export async function retryDocumentCleanup() {
  const files = await prisma.pendingFileDeletion.findMany({ orderBy: { queuedAt: "asc" }, take: 20 });
  const results = await Promise.all(files.map(file => removeQueuedFile(file.fileKey)));
  return { removed: results.filter(Boolean).length, pending: results.filter(ok => !ok).length };
}
