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
import { normalizeHashtag } from "@/lib/posts/content";
import { z } from "zod";
/** El alcance global sólo incluye publicaciones públicas de círculos activos; nunca expone datos administrativos. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const parsed = z.object({ tag: z.string().regex(/^[\p{L}\p{M}\p{N}_]{1,64}$/u), entityId: z.string().uuid(), scope: z.enum(["entity", "all"]), page: z.coerce.number().int().min(1).max(10000), limit: z.coerce.number().int().min(1).max(30) }).safeParse({tag:q.get("tag"),entityId:q.get("entityId"),scope:q.get("scope") || "entity",page:q.get("page") || 1,limit:q.get("limit") || 10});
  if (!parsed.success) return Response.json({success:false,message:"Filtro de etiqueta inválido"},{status:400});
  const {tag, entityId, scope, page, limit} = parsed.data;
  try {
    const origin = await prisma.entity.findFirst({where:{id:entityId,status:"ACTIVE"},select:{id:true,name:true}});
    if (!origin) return Response.json({success:false,message:"Círculo no disponible"},{status:404});
    const where = {hashtags:{has:normalizeHashtag(tag)},entity:{status:"ACTIVE" as const},...(scope === "entity" ? {entityId} : {})};
    const [posts,total] = await prisma.$transaction([
      prisma.post.findMany({where,orderBy:[{updatedAt:"desc"},{id:"desc"}],skip:(page-1)*limit,take:limit,select:{id:true,title:true,content:true,imageUrl:true,createdAt:true,updatedAt:true,entity:{select:{id:true,name:true,logoUrl:true}},author:{select:{firstName:true,lastName:true}}}}),
      prisma.post.count({where}),
    ]);
    return Response.json({success:true,origin,posts,pagination:{page,limit,total,totalPages:Math.ceil(total/limit),hasNextPage:page*limit<total,hasPreviousPage:page>1}});
  } catch { return Response.json({success:false,message:"No se pudieron consultar las publicaciones"},{status:500}); }
}
