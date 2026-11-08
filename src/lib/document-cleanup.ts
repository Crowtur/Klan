/**
 * ==============================================================================
 * PONTIFICIA UNIVERSIDAD CATÓLICA DEL ECUADOR
 * Facultad Internacional de Innovación (PUCE - Icam)
 * ==============================================================================
 * 
 * PROYECTO DE TITULACIÓN - INGENIERÍA INTEGRAL
 * Autor: Diego Alexis Tipán Zambrano
 * Director del Proyecto: PhD. Rafael Melgarejo
 * Promoción: Primera Promoción (Año 2026)
 * 
 * ------------------------------------------------------------------------------
 * DECLARACIÓN SOBRE EL USO DE INTELIGENCIA ARTIFICIAL
 * ------------------------------------------------------------------------------
 * Se declara formalmente el uso de herramientas de Inteligencia Artificial como
 * soporte y asistente técnico para el desarrollo de este proyecto, destacando su
 * aplicación en:
 * 
 * - Generación y optimización de bloques de código repetitivos y extensos.
 * - Desarrollos de endpoints complejos con variabilidad de permisos y roles.
 * - Integración de nuevas funciones y sugerencias de arquitectura de software.
 * - Depuración ágil, corrección de errores y optimización de rendimiento.
 * - Creación, maquetación e integración de diseños UI/UX de formato visual a código.
 * - Automatización de documentación técnica y estructuración de comentarios.
 * 
 * Herramientas de IA utilizadas:
 * - GPT-5.6 Luna
 * - GPT-6 Astra
 * - Gemini 3.6 Flash
 * - Figma AI (Visual Engine / Make Real)
 * 
 * ------------------------------------------------------------------------------
 * DERECHOS DE AUTOR Y PROPIEDAD INTELECTUAL
 * ------------------------------------------------------------------------------
 * Los derechos del presente proyecto corresponden a la Pontificia Universidad
 * Católica del Ecuador junto al autor y al director del proyecto, en estricto
 * cumplimiento del reglamento institucional sobre patentes, tesis y titulación.
 * 
 * ALCANCE: Dichos derechos aplican exclusivamente al código fuente desarrollado
 * en este proyecto, excluyendo la idea de negocio global y futuras versiones 
 * o derivados sustanciales que puedan desarrollarse sobre el sistema.
 * ==============================================================================
 */

import { prisma } from "@/lib/prisma";
import { deleteUploadThingFile } from "@/lib/uploadthing-server";

/** Retira la entrada de la cola al borrar el archivo remoto. Si falla, la mueve al final para permitir otros reintentos. */
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

/** Procesa las veinte entradas más antiguas y devuelve cuántas se eliminaron en esta ejecución. */
export async function retryDocumentCleanup() {
  const files = await prisma.pendingFileDeletion.findMany({ orderBy: { queuedAt: "asc" }, take: 20 });
  const results = await Promise.all(files.map(file => removeQueuedFile(file.fileKey)));
  return { removed: results.filter(Boolean).length, pending: results.filter(ok => !ok).length };
}
