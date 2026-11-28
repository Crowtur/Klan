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
import { deleteUploadThingFile } from "@/lib/uploadthing-server";
import { z } from "zod";
/** Desvincula el PDF vigente mediante control de versión; un fallo de limpieza no restaura contenido retirado. */
export async function DELETE(request:Request,context:{params:Promise<{entityId:string}>}) {
  try {
    const user=await requireAuth(request),{entityId}=await context.params;
    await requireEntityContentAdmin(user.id,entityId);
    const parsed=z.object({version:z.number().int().min(0)}).strict().safeParse(await request.json());
    if(!parsed.success)return Response.json({success:false,message:"Versión inválida"},{status:400});
    const key=await prisma.$transaction(async tx=>{
      await requireEntityContentAdmin(user.id,entityId,tx);
      const old=await tx.entity.findUniqueOrThrow({where:{id:entityId},select:{rulesDocumentFileKey:true}});
      const saved=await tx.entity.updateMany({where:{id:entityId,rulesDocumentVersion:parsed.data.version},data:{rulesDocumentUrl:null,rulesDocumentFileKey:null,rulesDocumentFileName:null,rulesDocumentVersion:{increment:1}}});
      if(saved.count!==1)throw Error("CONFLICT");
      return old.rulesDocumentFileKey;
    },{isolationLevel:"Serializable"});
    if(key)try {if(!await prisma.entity.count({where:{rulesDocumentFileKey:key}}))await deleteUploadThingFile(key);}catch{console.error("No se pudo limpiar el PDF retirado del círculo");}
    return Response.json({success:true});
  }catch(error){return contentError(error);}
}
