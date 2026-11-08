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
import { NextResponse } from "next/server";
// Public projection: active club and active plans only. Never exposes members or finances.
/** Proyecta los campos públicos del club y de sus planes activos para la ficha de exploración. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ clubId: string }> },
) {
  try {
    const { clubId } = await context.params;
    const club = await prisma.club.findFirst({
      where: { id: clubId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt:true, _count:{select:{memberships:{where:{status:"ACTIVE"}}}}, logoUrl: true,address:true,googleMapsUrl:true,coverUrl:true,
      },
    });
    if (!club)
      return NextResponse.json(
        { success: false, message: "Club no disponible" },
        { status: 404 },
      );
    const plans = await prisma.membershipPlan.findMany({
      where: { clubId, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        price: true,
        durationValue: true,
        durationUnit: true,billingMode:true,
        requiresDocumentation: true,
        benefits: true,
        documentRequirements: {
          where: { isActive: true },
          select: { id: true, name: true, description: true, isRequired: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ success: true, club, plans });
  } catch {
    return NextResponse.json(
      { success: false, message: "No se pudo consultar el club" },
      { status: 500 },
    );
  }
}
