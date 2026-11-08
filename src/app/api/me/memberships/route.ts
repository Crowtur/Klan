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

/** Devuelve las membresías del usuario y el contexto de acceso de sus clubes. */
export async function GET(request: Request) {
  try {
    // 1. Obtener el usuario autenticado.
    const user = await requireAuth(request);

    // 2. Consultar únicamente sus membresías.
    const memberships = await prisma.clubMembership.findMany({
      where: {
        userId: user.id,
      },
      orderBy: [
        { joinedAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        role: true,
        status: true,
        joinedAt: true,
        removedAt: true, finishedAt: true,
        removalReason: true,

        club: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            status: true,
            logoUrl: true, coverUrl: true, address: true,
          },
        },
      },
    });

    // 3. Devolver los resultados.
    return NextResponse.json({
      success: true,
      memberships,
      total: memberships.length,
    });
  } catch (error) {
    console.error("Get my memberships error:", error);

    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
