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
import { requireAuth } from "@/lib/auth/auth";
import { contentError, requireEntityContentAdmin } from "@/lib/entities/content-access";
import { z } from "zod";
const ruleInput = z.object({title:z.string().trim().min(1).max(120),content:z.string().trim().min(1).max(5000),sortOrder:z.number().int().min(0).max(9999)}).strict();
/** La lectura pública expone únicamente reglas y documento publicados de un círculo activo. */
export async function GET(_request: Request, context: {params:Promise<{entityId:string}>}) {
  try {
    const {entityId}=await context.params;
    const entity=await prisma.entity.findFirst({where:{id:entityId,status:"ACTIVE"},select:{rulesDocumentUrl:true,rulesDocumentFileName:true,rulesDocumentVersion:true,rules:{orderBy:[{sortOrder:"asc"},{id:"asc"}]}}});
    if(!entity)return Response.json({success:false,message:"Círculo no disponible"},{status:404});
    return Response.json({success:true,rules:entity.rules,document:entity.rulesDocumentUrl?{url:entity.rulesDocumentUrl,name:entity.rulesDocumentFileName}:null,documentVersion:entity.rulesDocumentVersion});
  } catch(error) { return contentError(error); }
}
/** Crea una regla sólo después de comprobar el administrador dentro de la transacción. */
export async function POST(request:Request,context:{params:Promise<{entityId:string}>}) {
  try {
    const user=await requireAuth(request),{entityId}=await context.params;
    await requireEntityContentAdmin(user.id,entityId);
    const parsed=ruleInput.safeParse(await request.json());
    if(!parsed.success)return Response.json({success:false,message:"Completa título, regla y orden (0 a 9999)"},{status:400});
    const rule=await prisma.$transaction(async tx=>{await requireEntityContentAdmin(user.id,entityId,tx);return tx.entityRule.create({data:{entityId,...parsed.data}});},{isolationLevel:"Serializable"});
    return Response.json({success:true,rule},{status:201});
  }catch(error){return contentError(error);}
}
