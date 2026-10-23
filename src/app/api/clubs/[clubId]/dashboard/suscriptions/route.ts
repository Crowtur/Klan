
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
  return new Date(
    Date.UTC(year, month - 1, 1, 5, 0, 0)
  );
}

function getCurrentEcuadorMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TIME_ZONE,
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

    // 4. Parámetros de período
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

    // 5. Fechas de referencia
    const next7Days = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000
    );

    const next30Days = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const firstMonthStart = getEcuadorMonthStart(
      year,
      month - 11
    );

    const nextMonthStart = getEcuadorMonthStart(
      year,
      month + 1
    );

    // 6. Consultas
    const [
      statusGroups,
      activeSubscriptions,
      expiring7Days,
      expiring30Days,
      gracePeriodCount,
      upcomingExpirations,
      monthlyCreationRecords,
      plans,
    ] = await prisma.$transaction([
      prisma.subscription.groupBy({
        by: ["status"],
        where: {
          clubMembership: { clubId },
        },
        _count: { _all: true },
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
          id: true,
          planId: true,
          clubMembershipId: true,
        },
      }),

      prisma.subscription.count({
        where: {
          status: "ACTIVE",
          expiresAt: {
            gt: now,
            lte: next7Days,
          },
          clubMembership: {
            clubId,
            status: "ACTIVE",
          },
          plan: {
            clubId,
            isActive: true,
          },
        },
      }),

      prisma.subscription.count({
        where: {
          status: "ACTIVE",
          expiresAt: {
            gt: now,
            lte: next30Days,
          },
          clubMembership: {
            clubId,
            status: "ACTIVE",
          },
          plan: {
            clubId,
            isActive: true,
          },
        },
      }),

      prisma.subscription.count({
        where: {
          gracePeriodEndsAt: {
            gt: now,
          },
          expiresAt: {
            lte: now,
          },
          status: {
            in: ["EXPIRED", "SUSPENDED"],
          },
          clubMembership: {
            clubId,
          },
        },
      }),

      prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          expiresAt: {
            gt: now,
            lte: next30Days,
          },
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
          id: true,
          expiresAt: true,
          plan: {
            select: {
              id: true,
              name: true,
            },
          },
          clubMembership: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          expiresAt: "asc",
        },
        take: 10,
      }),

      prisma.subscription.findMany({
        where: {
          clubMembership: { clubId },
          createdAt: {
            gte: firstMonthStart,
            lt: nextMonthStart,
          },
        },
        select: {
          createdAt: true,
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

    // 7. Resumen de estados
    const statusCounts: Record<string, number> = {
      PENDING_PAYMENT: 0,
      ACTIVE: 0,
      EXPIRED: 0,
      CANCELLED: 0,
      SUSPENDED: 0,
    };

    for (const group of statusGroups) {
      statusCounts[group.status] = group._count._all;
    }

    const totalSubscriptions = Object.values(
      statusCounts
    ).reduce((total, count) => total + count, 0);

    // 8. Distribución de suscripciones vigentes por plan
    const subscriptionsByPlan = plans.map((plan) => {
      const matchingSubscriptions =
        activeSubscriptions.filter(
          (subscription) =>
            subscription.planId === plan.id
        );

      return {
        planId: plan.id,
        planName: plan.name,
        planType: plan.type,
        isActive: plan.isActive,
        activeSubscriptions:
          matchingSubscriptions.length,
        uniqueMembers: new Set(
          matchingSubscriptions.map(
            (subscription) =>
              subscription.clubMembershipId
          )
        ).size,
      };
    });

    // 9. Evolución mensual
    const monthlyCreations = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(
        Date.UTC(year, month - 1 - i, 1)
      );

      const itemYear = date.getUTCFullYear();
      const itemMonth = date.getUTCMonth() + 1;

      const count = monthlyCreationRecords.filter(
        (record) => {
          const local = getCurrentEcuadorMonth(
            record.createdAt
          );

          return (
            local.year === itemYear &&
            local.month === itemMonth
          );
        }
      ).length;

      monthlyCreations.push({
        year: itemYear,
        month: itemMonth,
        label:
          `${itemYear}-${String(itemMonth).padStart(2, "0")}`,
        newSubscriptions: count,
      });
    }

    // 10. Respuesta
    return NextResponse.json({
      success: true,

      club,

      referencePeriod: {
        year,
        month,
        timeZone: CLUB_TIME_ZONE,
      },

      summary: {
        totalSubscriptions,
        byStatus: statusCounts,
        currentlyActive: activeSubscriptions.length,
      },

      expirations: {
        next7Days: expiring7Days,
        next30Days: expiring30Days,
        inGracePeriod: gracePeriodCount,
      },

      subscriptionsByPlan,

      upcomingExpirations,

      monthlyCreations,
    });
  } catch (error) {
    console.error(
      "Club dashboard subscriptions error:",
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
