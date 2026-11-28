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

import {cookies} from "next/headers";
import {userFromToken} from "@/lib/auth/auth";
import {activeMember} from "@/lib/entities/active";
import {prisma} from "@/lib/prisma";
import {HashtagResults} from "@/components/workspace/hashtag-results";
import "@/components/workspace/workspace.css";
/** La búsqueda pública conserva sus parámetros en la URL para compartirla y navegar con teclado. */
export default async function Page({searchParams}:{searchParams:Promise<{tag?:string;entity?:string}>}) {
  const q=await searchParams;
  // Se calcula el destino con los mismos criterios de vigencia que la vista privada.
  const entityId=typeof q.entity==="string"?q.entity:"";
  const user=await userFromToken((await cookies()).get("auth_token")?.value);
  const member=user && entityId && (user.globalRole==="SUPER_ADMIN" || await prisma.entityMembership.findFirst({
    where:{entityId,userId:user.id,entity:{status:"ACTIVE"},...activeMember()},select:{id:true}
  }));
  const returnHref=member?"/app?view=entity&tab=posts&entity="+encodeURIComponent(entityId):"/entity/"+encodeURIComponent(entityId);
  return <main id="main-content" className="workspace"><HashtagResults returnHref={returnHref} key={`${q.tag}:${q.entity}`} tag={typeof q.tag==='string'?q.tag:''} entityId={typeof q.entity==='string'?q.entity:''}/></main>;
}
