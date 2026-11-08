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

import {prisma} from "@/lib/prisma";
import {requireAuth} from "@/lib/auth/auth";
/** Comprueba los requisitos documentales antes de enviar la solicitud a revisión. */
export async function POST(req:Request,ctx:{params:Promise<{applicationId:string;clubId:string}>}){
  try{
    const user=await requireAuth(req);
    const {applicationId,clubId}=await ctx.params;
    return await prisma.$transaction(async tx=>{
      const app=await tx.membershipApplication.findFirst({where:{id:applicationId,userId:user.id,plan:{clubId,club:{status:"ACTIVE"}}},include:{plan:{include:{documentRequirements:{where:{isActive:true,isRequired:true}}}},documents:{where:{deletedAt:null}}}});
      if(!app)return Response.json({success:false},{status:404});
      if(!["PENDING","DOCUMENTATION_REVIEW"].includes(app.status))return Response.json({success:false},{status:409});
      const missing=app.plan.documentRequirements.filter(r=>!app.documents.some(d=>d.requirementId===r.id&&d.status!=="REJECTED")).map(r=>r.id);
      if(missing.length)return Response.json({success:false,missing},{status:409});
      await tx.membershipApplication.update({where:{id:app.id,status:app.status},data:{status:"DOCUMENTATION_REVIEW"}});
      const admins=await tx.clubMembership.findMany({where:{clubId,role:"CLUB_ADMIN",status:"ACTIVE"},select:{userId:true}});
      const eventKey="submitted:"+app.id+":"+app.documents.map(d=>d.id+"."+d.version).sort().join(",");
      await tx.notification.createMany({data:admins.map(m=>({clubId,recipientId:m.userId,type:"DOCUMENTS_SUBMITTED",eventKey,title:app.documents.length?"Documentación recibida para revisión":"Solicitud recibida para revisión",entityType:"application",entityId:app.id,targetPath:"/app?view=club&club="+clubId})),skipDuplicates:true});
      return Response.json({success:true,status:"DOCUMENTATION_REVIEW"});
    },{isolationLevel:"Serializable"});
  }catch(e){return Response.json({success:false},{status:e instanceof Error&&e.message==="UNAUTHORIZED"?401:500});}
}
