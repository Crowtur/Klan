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

type Notice={type:string;clubId?:string|null;targetPath?:string|null};
/** Traduce el tipo de aviso en una vista personal o una pestaña del club correspondiente. */
export function notificationDestination(n:Notice){
 if(["APPLICATION_SUBMITTED","DOCUMENTS_SUBMITTED"].includes(n.type))return {scope:"club",tab:"applications",path:`/app?view=club&club=${encodeURIComponent(n.clubId||"")}&tab=applications`};
 if(/^(APPLICATION|DOCUMENT)_/.test(n.type))return {scope:"personal",tab:"applications",path:"/app?view=applications"};
 if(n.type.startsWith("SETTLEMENT"))return {scope:"club",tab:"overview",path:`/app?view=club&club=${encodeURIComponent(n.clubId||"")}&tab=overview`};
 if(n.type.startsWith("RESERVATION"))return {scope:"club",tab:"reservations",path:`/app?view=club&club=${encodeURIComponent(n.clubId||"")}&tab=reservations`};
 return {scope:"personal",tab:"memberships",path:n.targetPath||"/app?view=memberships"};
}
/** Adapta los títulos de las solicitudes recibidas para distinguirlas de los trámites propios. */
export function notificationTitle(n:Notice & {title:string}){return n.type==="DOCUMENTS_SUBMITTED" && n.title==="Documentación enviada"?"Documentación recibida para revisión":n.type==="APPLICATION_SUBMITTED"?"Nueva solicitud de ingreso recibida":n.title;}
/** Calcula la antigüedad respecto al instante de referencia y elige una unidad legible. */
export function relativeTime(value:string,now=Date.now()){
 const seconds=Math.max(0,Math.floor((now-Date.parse(value))/1000));
 if(!Number.isFinite(seconds))return "Fecha no disponible";
 for(const [size,name] of [[31536000,"año"],[2592000,"mes"],[604800,"semana"],[86400,"día"],[3600,"hora"],[1,"segundo"]] as const){if(seconds>=size || size===1){const n=Math.floor(seconds/size);return `Hace ${n} ${name}${n===1?"":name==="mes"?"es":"s"}`;}}
 return "Hace 0 segundos";
}
