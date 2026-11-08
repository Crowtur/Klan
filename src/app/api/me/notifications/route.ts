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

import {requireAuth} from "@/lib/auth/auth";
import {prisma} from "@/lib/prisma";
function fail(e:unknown) {return Response.json({success:false},{status:e instanceof Error && e.message==="UNAUTHORIZED"?401:500});}
/** Pagina los avisos del destinatario y calcula cuántos siguen sin leerse. */
export async function GET(req:Request) {
  try {
    const user=await requireAuth(req);
    const q=new URL(req.url).searchParams;
    const page=Number(q.get("page")??1);
    if(!Number.isSafeInteger(page)||page<1||page>10000)return Response.json({success:false},{status:400});
    const where={recipientId:user.id,...(q.get("clubId")&&{clubId:q.get("clubId")!})};
    const groups = prisma.notification.groupBy({
      by: ["clubId", "type"], orderBy: {clubId: "asc"},
      where: {...where, readAt: null}, _count: true
    });
    if (q.get("summary") === "1") {
      return Response.json({success: true, byClub: await groups});
    }
    const [notifications,total,byClub]=await prisma.$transaction([
      prisma.notification.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(page-1)*25,take:25}),
      prisma.notification.count({where}), groups
    ]);
    const unread = byClub.reduce((sum, group) => sum + group._count, 0);
    return Response.json({success:true,notifications,total,page,unread,byClub});
  }catch(e){return fail(e);}
}
/** Marca los avisos propios como leídos según el identificador o el ámbito indicado. */
export async function PATCH(req:Request) {
  try {
    const user=await requireAuth(req);
    const body=await req.json().catch(()=>null);
    if (body && typeof body.clubId === "string" && typeof body.tab === "string") {
      const sections = {
        applications: ["APPLICATION_SUBMITTED","DOCUMENTS_SUBMITTED"],
        reservations: ["RESERVATION_CREATED","RESERVATION_CANCELLED"],
        overview: ["SETTLEMENT_UPDATED"]
      } as const;
      if (!Object.hasOwn(sections, body.tab)) return Response.json({success:false},{status:400});
      const types = sections[body.tab as keyof typeof sections];
      const result = await prisma.notification.updateMany({
        where:{recipientId:user.id, clubId:body.clubId, readAt:null, type:{in:[...types]}},
        data:{readAt:new Date()}
      });
      return Response.json({success:true,updated:result.count});
    }
    if(typeof body?.id!=="string")return Response.json({success:false},{status:400});
    const result=await prisma.notification.updateMany({where:{id:body.id,recipientId:user.id,readAt:null},data:{readAt:new Date()}});
    return Response.json({success:true,updated:result.count});
  }catch(e){return fail(e);}
}
