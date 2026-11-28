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
import type { Prisma } from "@prisma/client";
/** Revalida el estado del usuario, el círculo y el rol dentro de la misma transacción que modifica sus reglas. */
export async function requireEntityContentAdmin(userId: string, entityId: string, db: Prisma.TransactionClient = prisma) {
  const [user, entity] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { globalRole: true, status: true } }),
    db.entity.findUnique({ where: { id: entityId }, select: { id: true, status: true } }),
  ]);
  if (user?.status !== "ACTIVE" || entity?.status !== "ACTIVE") throw Error("FORBIDDEN");
  if (user.globalRole !== "SUPER_ADMIN" && !await db.entityMembership.count({ where: { userId, entityId, status: "ACTIVE", role: "ENTITY_ADMIN" } })) throw Error("FORBIDDEN");
}
/** Convierte fallos conocidos en respuestas estables sin revelar detalles internos. */
export function contentError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code = (error as {code?: string})?.code;
  const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message === "NOT_FOUND" ? 404 : message === "CONFLICT" || code === "P2034" || code === "P2025" ? 409 : error instanceof SyntaxError ? 400 : 500;
  return Response.json({ success: false, message: ({401:"Debes iniciar sesión",403:"No tienes permisos para modificar este círculo",404:"Registro no encontrado",409:"El contenido cambió. Actualiza e intenta nuevamente",400:"Datos inválidos",500:"No se pudo completar la operación"} as Record<number,string>)[status] }, { status });
}
