
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";

type YearMonth = {
  year: number;
  month: number;
};

const TIME_ZONE = "America/Guayaquil";

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
      prisma.club.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      // Usuarios por estado
      prisma.user.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      // Membresías totales
      prisma.clubMembership.count(),

      // Membresías activas
      prisma.clubMembership.count({
        where: {
          status: "ACTIVE",
        },
      }),

      // Suscripciones por estado
      prisma.subscription.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

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
        _count: { _all: true },
      }),

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
      clubsByStatus[group.status] = group._count._all;
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
      usersByStatus[group.status] = group._count._all;
    }

    const totalUsers =
      usersByStatus.ACTIVE +
      usersByStatus.INACTIVE +
      usersByStatus.SUSPENDED;

    // 7. Distribución de suscripciones
    const subscriptionsByStatus = {
      PENDING_PAYMENT: 0,
      ACTIVE: 0,
      EXPIRED: 0,
      CANCELLED: 0,
      SUSPENDED: 0,
    };

    for (const group of subscriptionStatusGroups) {
      subscriptionsByStatus[group.status] =
        group._count._all;
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
        group._count._all;
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
