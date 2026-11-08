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
import { NextResponse } from "next/server";
/** Lista las solicitudes propias junto con los datos de plan y documentación necesarios para su seguimiento. */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const applications = await prisma.membershipApplication.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        rejectionReason: true,
        plan: {
          select: {
            id: true,
            name: true,
            clubId: true,
            requiresDocumentation: true, billingMode:true,price:true,
            club: { select: { id: true, name: true,logoUrl:true } },
            documentRequirements: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                description: true,
                isRequired: true,
              },
            },
          },
        },
        documents: { where:{deletedAt:null},
          select: {
            id: true,
            requirementId: true,
            fileUrl: true,
            fileName: true, fileSizeBytes:true,mimeType:true,version:true,uploadedAt:true,reviewedAt:true,
            status: true,
            rejectionReason: true,
          },
        },
      },
    });
    return NextResponse.json({ success: true, applications:applications.map(app=>({...app,missing:app.plan.documentRequirements.filter(r=>r.isRequired&&!app.documents.some(d=>d.requirementId===r.id)).map(r=>r.id),rejected:app.documents.filter(d=>d.status==="REJECTED").map(d=>d.requirementId)})) });
  } catch (e) {
    const unauthorized = e instanceof Error && e.message === "UNAUTHORIZED";
    return NextResponse.json(
      {
        success: false,
        message: unauthorized
          ? "No autenticado"
          : "No se pudieron consultar las solicitudes",
      },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
