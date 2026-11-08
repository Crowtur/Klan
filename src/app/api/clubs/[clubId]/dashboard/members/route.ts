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

import {activeMember} from "@/lib/clubs/active";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubMembership } from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{
    clubId: string;
  }>;
};

const CLUB_TIME_ZONE = "America/Guayaquil";

function getEcuadorMonthStart(
  year: number,
  month: number
): Date {
  // Ecuador continental: UTC-05:00
  return new Date(
    Date.UTC(year, month - 1, 1, 5, 0, 0)
  );
}

/** Calcula el mes del informe con el calendario de Ecuador continental. */
function getCurrentEcuadorMonth(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
  };
}

/** Calcula la composición y la evolución de las membresías dentro del club seleccionado. */
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Autenticación
    const user = await requireAuth(request);
    const { clubId } = await context.params;

    // 2. Autorización contextual
    const membership = await requireClubMembership(
      user.id,
      clubId
    );

    if (membership.role !== "CLUB_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere el rol CLUB_ADMIN",
        },
        { status: 403 }
      );
    }

    // 3. Validar el club
    const club = await prisma.club.findFirst({
      where: {
        id: clubId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!club) {
      return NextResponse.json(
        {
          success: false,
          message: "Club no encontrado o inactivo",
        },
        { status: 404 }
      );
    }

    const now = new Date();

    // 4. Seleccionar mes de referencia
    const { searchParams } = new URL(request.url);

    const currentMonth = getCurrentEcuadorMonth(now);

    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const year =
      yearParam === null
        ? currentMonth.year
        : Number(yearParam);

    const month =
      monthParam === null
        ? currentMonth.month
        : Number(monthParam);

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Parámetros year o month inválidos",
        },
        { status: 400 }
      );
    }

    // 5. Últimos 12 meses hasta el mes seleccionado
    const firstMonthStart = getEcuadorMonthStart(
      year,
      month - 11
    );

    const nextMonthStart = getEcuadorMonthStart(
      year,
      month + 1
    );

    // 6. Consultas a la base de datos
    const [
      totalMembers,
      activeMembers,
      suspendedMembers,
      removedMembers,
      activeAdmins,
      activeRegularMembers,
      monthlyJoinRecords,
      activeSubscriptions,
      activePlans,
    ] = await prisma.$transaction([
      prisma.clubMembership.count({
        where: { clubId },
      }),

      prisma.clubMembership.count({
        where: {
          clubId,...activeMember(),
        },
      }),

      prisma.clubMembership.count({
        where: {
          clubId,
          status: "SUSPENDED",
        },
      }),

      prisma.clubMembership.count({
        where: {
          clubId,
          status: "REMOVED",
        },
      }),

      prisma.clubMembership.count({
        where: {
          clubId,...activeMember(),
          role: "CLUB_ADMIN",
        },
      }),

      prisma.clubMembership.count({
        where: {
          clubId,...activeMember(),
          role: "MEMBER",
        },
      }),

      prisma.clubMembership.findMany({
        where: {
          clubId,
          joinedAt: {
            gte: firstMonthStart,
            lt: nextMonthStart,
          },
        },
        select: {
          joinedAt: true,
        },
      }),

      prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          startedAt: { lte: now },
          expiresAt: { gt: now },
          clubMembership: {
            clubId,
            status: "ACTIVE",
          },
          plan: {
            clubId,
            isActive: true,
          },
        },
        select: {
          clubMembershipId: true,
          planId: true,
        },
      }),

      prisma.membershipPlan.findMany({
        where: { clubId },
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    // 7. Construir la evolución mensual
    const monthlyGrowth = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(
        Date.UTC(year, month - 1 - i, 1)
      );

      const itemYear = date.getUTCFullYear();
      const itemMonth = date.getUTCMonth() + 1;

      const count = monthlyJoinRecords.filter(
        (record) => {
          const local = getCurrentEcuadorMonth(
            record.joinedAt
          );

          return (
            local.year === itemYear &&
            local.month === itemMonth
          );
        }
      ).length;

      monthlyGrowth.push({
        year: itemYear,
        month: itemMonth,
        label:
          `${itemYear}-${String(itemMonth).padStart(2, "0")}`,
        newMembers: count,
      });
    }

    // 8. Miembros únicos con suscripción vigente
    const subscribedMemberIds = new Set(
      activeSubscriptions.map(
        (subscription) => subscription.clubMembershipId
      )
    );

    const membersWithSubscription =
      subscribedMemberIds.size;

    const membersWithoutSubscription = Math.max(
      0,
      activeMembers - membersWithSubscription
    );

    // 9. Distribución por plan
    const membersByPlan = activePlans.map((plan) => {
      const uniqueMemberIds = new Set(
        activeSubscriptions
          .filter(
            (subscription) =>
              subscription.planId === plan.id
          )
          .map(
            (subscription) =>
              subscription.clubMembershipId
          )
      );

      return {
        planId: plan.id,
        planName: plan.name,
        planType: plan.type,
        isActive: plan.isActive,
        members: uniqueMemberIds.size,
      };
    });

    return NextResponse.json({
      success: true,

      club,

      referencePeriod: {
        year,
        month,
        timeZone: CLUB_TIME_ZONE,
      },

      summary: {
        totalMembers,
        activeMembers,
        suspendedMembers,
        removedMembers,
      },

      roles: {
        activeAdmins,
        activeRegularMembers,
      },

      subscriptions: {
        membersWithSubscription,
        membersWithoutSubscription,
      },

      membersByPlan,

      monthlyGrowth,
    });
  } catch (error) {
    console.error(
      "Club dashboard members error:",
      error
    );

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
            message: "Acceso denegado",
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
