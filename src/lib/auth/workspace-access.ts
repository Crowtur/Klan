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

// Refactorización Parte 11: navegación privada por entidad y alternativa pública en /entity/[entityId].

import { prisma } from "@/lib/prisma";

type Query = Record<string,string|string[]|undefined>;
type Actor = {id:string;globalRole:string} | null;
function first(value:Query[string]) { return Array.isArray(value) ? value[0] : value; }

/** Decide el destino antes de montar Workspace. Solo las vistas de la entidad pueden usar su ficha pública como alternativa. */
export async function workspaceRedirect(query:Query, user:Actor):Promise<string|null> {
  const view=first(query.view);
  const entity=first(query.entity);
  const privateEntity=view==="entity" || view==="facility";
  const publicPath=entity ? "/entity/"+encodeURIComponent(entity) : null;
  if (!user) return (privateEntity || view==="publicEntity") && publicPath ? publicPath : "/login";
  if (!privateEntity || !entity || user.globalRole==="SUPER_ADMIN") return null;
  const membership=await prisma.entityMembership.findFirst({
    where:{entityId:entity,userId:user.id,status:"ACTIVE",entity:{status:"ACTIVE"}},
    select:{id:true}
  });
  return membership ? null : publicPath;
}
