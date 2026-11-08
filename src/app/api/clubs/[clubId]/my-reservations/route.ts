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


import { NextResponse } from "next/server";
import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubMembership } from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{
    clubId: string;
  }>;
};

/** Limita la consulta a la membresía del usuario dentro del club solicitado. */
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Autenticar al usuario
    const user = await requireAuth(request);

    const { clubId } = await context.params;

    // 2. Verificar membresía activa en el club
    const membership = await requireClubMembership(
      user.id,
      clubId
    );

    // 3. Obtener filtros opcionales
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // 4. Validar el filtro de estado
    if (
      status !== null &&
      status !== "CONFIRMED" &&
      status !== "CANCELLED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Estado inválido. Usa CONFIRMED o CANCELLED",
        },
        { status: 400 }
      );
    }

    // 5. Validar filtros de fechas
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    if (
      (fromDate && !Number.isFinite(fromDate.getTime())) ||
      (toDate && !Number.isFinite(toDate.getTime()))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Formato de fecha inválido",
        },
        { status: 400 }
      );
    }

    if (fromDate && toDate && fromDate >= toDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La fecha from debe ser anterior a to",
        },
        { status: 400 }
      );
    }

    // 6. Construir filtros de Prisma
    const where: Prisma.ReservationWhereInput = {
      clubMembershipId: membership.id,

      // Protección adicional de aislamiento multi-tenant
      facility: {
        clubId,
      },

      ...(status
        ? {
            status: status as ReservationStatus,
          }
        : {}),

      ...(fromDate || toDate
        ? {
            startAt: {
              ...(toDate ? { lt: toDate } : {}),
            },
            endAt: {
              ...(fromDate ? { gt: fromDate } : {}),
            },
          }
        : {}),
    };

    // 7. Consultar reservas del usuario
    const reservations = await prisma.reservation.findMany({
      where,
      select: {
        id: true,
        facilityId: true,
        clubMembershipId: true,
        startAt: true,
        endAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        facility: {
          select: {
            id: true,
            name: true,
            icon: true, location: true,
            description: true,
            status: true,
          },
        },
      },
      orderBy: {
        startAt: "desc",
      },
    });

    // 8. Calcular resumen
    const summary = {
      total: reservations.length,
      confirmed: reservations.filter(
        (reservation) =>
          reservation.status === "CONFIRMED"
      ).length,
      cancelled: reservations.filter(
        (reservation) =>
          reservation.status === "CANCELLED"
      ).length,
    };

    return NextResponse.json({
      success: true,
      clubId,
      reservations,
      summary,
    });
  } catch (error) {
    console.error("Get my reservations error:", error);

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
            message:
              "No tienes una membresía activa en este club",
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
