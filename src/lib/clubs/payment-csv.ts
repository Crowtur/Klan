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

import {Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
/** Aplica el filtro de pagos recibido y protege los campos CSV al generar la descarga. */
export async function paymentCsv(where:Prisma.PaymentWhereInput){
  const rows=await prisma.payment.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],select:{id:true,createdAt:true,paidAt:true,amount:true,currency:true,status:true,club:{select:{name:true}},subscription:{select:{planNameSnapshot:true,plan:{select:{name:true}}}}}});
  function escape(value:string){return '"'+(/^[\s]*[=+@-]/.test(value)?"'":"")+value.replaceAll('"','""')+'"';}
  const data=rows.map(r=>[r.id,r.club.name,r.subscription.planNameSnapshot??r.subscription.plan.name,r.amount.toFixed(2),r.currency,r.status,r.createdAt.toISOString(),r.paidAt?.toISOString()??""]);
  return new Response("\uFEFF"+[["ID","Club","Plan","Importe","Moneda","Estado","Creación","Pago"],...data].map(row=>row.map(escape).join(",")).join("\r\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="pagos.csv"',"Cache-Control":"private, no-store"}});
}
