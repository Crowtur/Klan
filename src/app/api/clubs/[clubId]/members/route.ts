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
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

// GET: Obtener catálogo de miembros del club
// Solo CLUB_ADMIN puede acceder
/** Lista las membresías del club para su administración, con el usuario y el estado asociados. */
export async function GET(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { clubId } = await context.params;

    await requireClubAdmin(user.id, clubId);

    const memberships = await prisma.clubMembership.findMany({
      where: {
        clubId,
      },
      include: {
        subscriptions:{where:{startedAt:{lte:new Date()},OR:[{status:"ACTIVE",expiresAt:{gt:new Date()}},{status:"PENDING_PAYMENT",gracePeriodEndsAt:{gt:new Date()}}]},select:{expiresAt:true,plan:{select:{id:true,name:true}}}},
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,avatarUrl:true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    const members = memberships.map((membership) => ({
      membershipId: membership.id,
      user: membership.user,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt,plans:membership.subscriptions,finishedAt:membership.finishedAt,removedAt:membership.removedAt,
    }));

    return NextResponse.json({
      success: true,
      members,
    });
  } catch (error) {
    console.error("Get club members error:", error);

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          {
            success: false,
            message: "No autenticado",
          },
          { status: 401 }
        );
      }

      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          {
            success: false,
            message: "No tienes permisos para ver los miembros de este club",
          },
          { status: 403 }
        );
      }
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