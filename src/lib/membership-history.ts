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

type Event={occurredAt:Date;newStatus:string;previousStatus:string|null;newRole?:string;previousRole?:string|null};
type Access={startedAt:Date|null;firstActivatedAt:Date|null;expiresAt:Date|null;gracePeriodEndsAt:Date|null;finishedAt:Date|null};
type Member={joinedAt:Date;removedAt:Date|null;finishedAt?:Date|null;status:string;role?:string;events:Event[];subscriptions?:Access[]};
// Reconstruct membership state and recorded access intervals at the exclusive bucket boundary.
/** Reconstruye estado y rol al cierre de cada intervalo mediante los eventos y las fechas de acceso. */
export function activeMembershipsAt(members:Member[],cutoff:Date){return members.filter(m=>{
 if(m.joinedAt>=cutoff)return false;
 const endedAt=m.removedAt??m.finishedAt;
 let status=m.events[0]?.previousStatus??(endedAt&&endedAt>=cutoff?"ACTIVE":m.status);
 let role=m.events[0]?.previousRole??m.role;
 if(m.events.length&&m.events[0].previousStatus===null)status="INACTIVE";
 // El corte es exclusivo: un evento ocurrido justo al cierre pertenece al siguiente intervalo.
 for(const e of m.events){if(e.occurredAt>=cutoff)break;status=e.newStatus;role=e.newRole??role;}
 if(!m.events.length&&endedAt&&endedAt<cutoff)status="REMOVED";
 if(status!=="ACTIVE")return false;
 if(role==="CLUB_ADMIN"||!m.subscriptions)return true;
 return m.subscriptions.some(s=>{const begin=s.firstActivatedAt??s.startedAt;const end=s.gracePeriodEndsAt&&(!s.expiresAt||s.gracePeriodEndsAt>s.expiresAt)?s.gracePeriodEndsAt:s.expiresAt;return begin&&begin<cutoff&&end&&end>=cutoff&&(!s.finishedAt||s.finishedAt>=cutoff)});
 }).length;}
