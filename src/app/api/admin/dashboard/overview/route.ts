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
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { Prisma } from "@prisma/client";

type YearMonth = {
  year: number;
  month: number;
};

const TIME_ZONE = "America/Guayaquil";

/** Busca el agregado del estado solicitado y devuelve cero si el grupo no existe. */
function getGroupCount(group: {
  _count?: true | { _all?: number };
}): number {
  const count = group._count;

  if (count === undefined || count === true) {
    throw new Error(
      "La consulta groupBy no devolvió el conteo esperado"
    );
  }

  if (typeof count._all !== "number") {
    throw new Error(
      "La consulta groupBy no devolvió _count._all"
    );
  }

  return count._all;
}

const clubStatusGroupArgs = {
  by: ["status"],
  orderBy: { status: "asc" },
  _count: { _all: true },
} satisfies Prisma.ClubGroupByArgs;

const userStatusGroupArgs = {
  by: ["status"],
  orderBy: { status: "asc" },
  _count: { _all: true },
} satisfies Prisma.UserGroupByArgs;

const subscriptionStatusGroupArgs = {
  by: ["status"],
  orderBy: { status: "asc" },
  _count: { _all: true },
} satisfies Prisma.SubscriptionGroupByArgs;

/** Determina el año y el mes usados para agrupar movimientos. */
function getLocalYearMonth(date: Date): YearMonth {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
  };
}

function monthStart(year: number, month: number): Date {
  // Ecuador continental: UTC-05:00
  return new Date(
    Date.UTC(year, month - 1, 1, 5, 0, 0)
  );
}

function monthLabel(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Construye los totales de la plataforma y su evolución mensual para el superadministrador. */
export async function GET(request: Request) {
  try {
    // 1. Autenticación
    const user = await requireAuth(request);

    // 2. Autorización global
    if (user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Acceso exclusivo para SUPER_ADMIN",
        },
        { status: 403 }
      );
    }

    // 3. Período de consulta
    const now = new Date();
    const current = getLocalYearMonth(now);

    const { searchParams } = new URL(request.url);

    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const year =
      yearParam === null
        ? current.year
        : Number(yearParam);

    const month =
      monthParam === null
        ? current.month
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

    const periodStart = monthStart(year, month);
    const periodEnd = monthStart(year, month + 1);
    const historyStart = monthStart(year, month - 11);

    // 4. Consultas globales
    const [
      clubStatusGroups,
      userStatusGroups,
      totalMemberships,
      activeMemberships,
      subscriptionStatusGroups,
      currentlyActiveSubscriptions,
      reservationStatusGroups,
      paidPaymentsAggregate,
      paidPaymentsCount,
      newClubsInPeriod,
      newUsersInPeriod,
      historicalClubs,
      historicalUsers,
    ] = await prisma.$transaction([
      // Clubes por estado
      prisma.club.groupBy(clubStatusGroupArgs),

      // Usuarios por estado
      prisma.user.groupBy(userStatusGroupArgs),

      // Membresías totales
      prisma.clubMembership.count(),

      // Membresías activas
      prisma.clubMembership.count({
        where: {
          status: "ACTIVE",
        },
      }),

      // Suscripciones por estado
      prisma.subscription.groupBy(subscriptionStatusGroupArgs),

      // Suscripciones realmente vigentes
      prisma.subscription.count({
        where: {
          status: "ACTIVE",
          startedAt: { lte: now },
          expiresAt: { gt: now },
          clubMembership: {
            status: "ACTIVE",
            club: {
              status: "ACTIVE",
            },
          },
          plan: {
            isActive: true,
          },
        },
      }),

      // Reservas cuyo inicio cae en el mes
      prisma.reservation.groupBy({
        by: ["status"],
        where: {
          startAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
        orderBy: {
          status: "asc",
        },
        _count: {
          _all: true,
        },
      } satisfies Prisma.ReservationGroupByArgs),

      // Importe de pagos confirmados en USD
      prisma.payment.aggregate({
        where: {
          status: "PAID",
          currency: "usd",
          paidAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // Número de pagos confirmados
      prisma.payment.count({
        where: {
          status: "PAID",
          currency: "usd",
          paidAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
      }),

      // Clubes creados durante el mes
      prisma.club.count({
        where: {
          createdAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
      }),

      // Usuarios creados durante el mes
      prisma.user.count({
        where: {
          createdAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
      }),

      // Clubes creados en los últimos 12 meses
      prisma.club.findMany({
        where: {
          createdAt: {
            gte: historyStart,
            lt: periodEnd,
          },
        },
        select: {
          createdAt: true,
        },
      }),

      // Usuarios creados en los últimos 12 meses
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: historyStart,
            lt: periodEnd,
          },
        },
        select: {
          createdAt: true,
        },
      }),
    ]);

    // 5. Distribución de clubes
    const clubsByStatus = {
      ACTIVE: 0,
      INACTIVE: 0,
      SUSPENDED: 0,
    };

    for (const group of clubStatusGroups) {
      clubsByStatus[group.status] = getGroupCount(group);
    }

    const totalClubs =
      clubsByStatus.ACTIVE +
      clubsByStatus.INACTIVE +
      clubsByStatus.SUSPENDED;

    // 6. Distribución de usuarios
    const usersByStatus = {
      ACTIVE: 0,
      INACTIVE: 0,
      SUSPENDED: 0,
    };

    for (const group of userStatusGroups) {
      usersByStatus[group.status] = getGroupCount(group);
    }

    const totalUsers =
      usersByStatus.ACTIVE +
      usersByStatus.INACTIVE +
      usersByStatus.SUSPENDED;

    // 7. Distribución de suscripciones
    const subscriptionsByStatus = {
      PENDING_PAYMENT: 0,
      FINISHED: 0,
      ACTIVE: 0,
      EXPIRED: 0,
      CANCELLED: 0,
      SUSPENDED: 0,
    };

    for (const group of subscriptionStatusGroups) {
      subscriptionsByStatus[group.status] =
        getGroupCount(group);
    }

    const totalSubscriptions = Object.values(
      subscriptionsByStatus
    ).reduce((sum, value) => sum + value, 0);

    // 8. Reservas del mes
    const reservationsByStatus = {
      CONFIRMED: 0,
      CANCELLED: 0,
    };

    for (const group of reservationStatusGroups) {
      reservationsByStatus[group.status] =
        getGroupCount(group);
    }

    const totalReservations =
      reservationsByStatus.CONFIRMED +
      reservationsByStatus.CANCELLED;

    // 9. Crecimiento mensual de clubes y usuarios
    const monthlyGrowth = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(
        Date.UTC(year, month - 1 - i, 1)
      );

      const itemYear = date.getUTCFullYear();
      const itemMonth = date.getUTCMonth() + 1;

      const newClubs = historicalClubs.filter(
        (club) => {
          const local = getLocalYearMonth(
            club.createdAt
          );

          return (
            local.year === itemYear &&
            local.month === itemMonth
          );
        }
      ).length;

      const newUsers = historicalUsers.filter(
        (userRecord) => {
          const local = getLocalYearMonth(
            userRecord.createdAt
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
        label: monthLabel(itemYear, itemMonth),
        newClubs,
        newUsers,
      });
    }

    // 10. Respuesta
    return NextResponse.json({
      success: true,

      period: {
        year,
        month,
        timeZone: TIME_ZONE,
        startAt: periodStart.toISOString(),
        endAtExclusive: periodEnd.toISOString(),
      },

      generatedAt: now.toISOString(),

      clubs: {
        total: totalClubs,
        active: clubsByStatus.ACTIVE,
        inactive: clubsByStatus.INACTIVE,
        suspended: clubsByStatus.SUSPENDED,
        newInPeriod: newClubsInPeriod,
      },

      users: {
        total: totalUsers,
        active: usersByStatus.ACTIVE,
        inactive: usersByStatus.INACTIVE,
        suspended: usersByStatus.SUSPENDED,
        newInPeriod: newUsersInPeriod,
      },

      memberships: {
        total: totalMemberships,
        active: activeMemberships,
      },

      subscriptions: {
        total: totalSubscriptions,
        byStatus: subscriptionsByStatus,
        currentlyActive: currentlyActiveSubscriptions,
      },

      reservations: {
        confirmed: reservationsByStatus.CONFIRMED,
        cancelled: reservationsByStatus.CANCELLED,
        total: totalReservations,
      },

      finances: {
        currency: "USD",
        paidPayments: paidPaymentsCount,
        grossRevenue:
          paidPaymentsAggregate._sum.amount?.toFixed(2)
          ?? "0.00",
      },

      monthlyGrowth,
    });
  } catch (error) {
    console.error(
      "SuperAdmin dashboard overview error:",
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