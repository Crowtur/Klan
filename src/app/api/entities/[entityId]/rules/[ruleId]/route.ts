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
type Context={params:Promise<{entityId:string;ruleId:string}>};
/** El identificador del círculo y la versión evitan modificaciones cruzadas o pérdida de cambios concurrentes. */
export async function PATCH(request:Request,context:Context) {
  try {
    const user=await requireAuth(request),{entityId,ruleId}=await context.params;
    await requireEntityContentAdmin(user.id,entityId);
    const parsed=z.object({title:z.string().trim().min(1).max(120),content:z.string().trim().min(1).max(5000),sortOrder:z.number().int().min(0).max(9999),version:z.number().int().positive()}).strict().safeParse(await request.json());
    if(!parsed.success)return Response.json({success:false,message:"Regla u orden inválidos"},{status:400});
    const rule=await prisma.$transaction(async tx=>{
      await requireEntityContentAdmin(user.id,entityId,tx);
      if(!await tx.entityRule.findFirst({where:{id:ruleId,entityId}}))throw Error("NOT_FOUND");
      const {version,...data}=parsed.data;
      const updated=await tx.entityRule.updateMany({where:{id:ruleId,entityId,version},data:{...data,version:{increment:1}}});
      if(updated.count!==1)throw Error("CONFLICT");
      return tx.entityRule.findUnique({where:{id:ruleId}});
    },{isolationLevel:"Serializable"});
    return Response.json({success:true,rule});
  }catch(error){return contentError(error);}
}
export async function DELETE(request:Request,context:Context) {
  try {
    const user=await requireAuth(request),{entityId,ruleId}=await context.params;
    await requireEntityContentAdmin(user.id,entityId);
    const parsed=z.object({version:z.number().int().positive()}).strict().safeParse(await request.json());
    if(!parsed.success)return Response.json({success:false,message:"Versión inválida"},{status:400});
    await prisma.$transaction(async tx=>{
      await requireEntityContentAdmin(user.id,entityId,tx);
      if(!await tx.entityRule.findFirst({where:{id:ruleId,entityId}}))throw Error("NOT_FOUND");
      if((await tx.entityRule.deleteMany({where:{id:ruleId,entityId,version:parsed.data.version}})).count!==1)throw Error("CONFLICT");
    },{isolationLevel:"Serializable"});
    return Response.json({success:true});
  }catch(error){return contentError(error);}
}
