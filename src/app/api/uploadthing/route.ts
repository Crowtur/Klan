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

/* Expone los manejadores de UploadThing en el entorno Node usando la política de carga definida en core.ts. */

import { after, type NextRequest } from "next/server";
import { createRouteHandler } from "uploadthing/next";

import { ourFileRouter } from "./core";

export const runtime = "nodejs";

// La notificación firmada debe volver al mismo despliegue que inició la carga.
export const maxDuration = 60;
// Sin sobrescritura explícita el adaptador conserva el origen real de la petición,
 // incluido el dominio personalizado. El SDK añade el slug al registrar cada archivo.
const callbackUrl = process.env.UPLOADTHING_CALLBACK_URL?.trim() || undefined;
// Una variable vacía también es legible para el SDK. Se pasa siempre una URL
// completa para impedir que ese valor vacío anule la detección automática.
function handler(request: NextRequest) {
  return createRouteHandler({
    router: ourFileRouter,
    config: {
      callbackUrl: callbackUrl || new URL("/api/uploadthing", request.url).href,
      // Next mantiene activa la tarea que persiste el resultado después del acuse HTTP.
      ...(process.env.NODE_ENV === "production"
        ? { handleDaemonPromise: (work: Promise<unknown>) => after(async () => { await work; }) }
        : {}),
    },
  });
}
export function GET(request: NextRequest) { return handler(request).GET(request); }
export function POST(request: NextRequest) { return handler(request).POST(request); }
