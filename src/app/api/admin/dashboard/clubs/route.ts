
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";

const TIME_ZONE = "America/Guayaquil";
const CURRENCY = "usd";

function monthStart(year: number, month: number) {
  return new Date(
    Date.UTC(year, month - 1, 1, 5, 0, 0)
  );
}

function getLocalYearMonth(date: Date) {
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

function monthLabel(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function isValidInteger(
  value: number,
  min: number,
  max: number
) {
  return (
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
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

    // 3. Parámetros
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

    const page = Number(
      searchParams.get("page") ?? "1"
    );

    const limit = Number(
      searchParams.get("limit") ?? "10"
    );

    const statusParam = searchParams.get("status");
    const search = (
      searchParams.get("search") ?? ""
    ).trim();

    const validStatuses = [
      "ACTIVE",
      "INACTIVE",
      "SUSPENDED",
    ] as const;

    if (
      !isValidInteger(year, 2000, 2100) ||
      !isValidInteger(month, 1, 12) ||
      !isValidInteger(page, 1, 1000000) ||
      !isValidInteger(limit, 1, 50) ||
      search.length > 100 ||
      (
        statusParam !== null &&
        !validStatuses.includes(
          statusParam as typeof validStatuses[number]
        )
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Parámetros de consulta inválidos",
        },
        { status: 400 }
      );
    }

    const periodStart = monthStart(year, month);
    const periodEnd = monthStart(year, month + 1);
    const historyStart = monthStart(year, month - 11);

    // 4. Construir filtros
    const where: Prisma.ClubWhereInput = {};

    if (statusParam) {
      where.status =
        statusParam as Prisma.EnumClubStatusFilter["equals"];
    }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // 5. Consultas principales
    const [
      totalMatchingClubs,
      statusGroups,
      clubsPage,
      allMatchingClubIds,
      historicalClubs,
    ] = await prisma.$transaction([
      prisma.club.count({
        where,
      }),

      prisma.club.groupBy({
        by: ["status"],
        where,
        _count: {
          _all: true,
        },
      }),

      prisma.club.findMany({
        where,
        orderBy: [
          { createdAt: "desc" },
          { id: "asc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
        },
      }),

      prisma.club.findMany({
        where,
        select: {
          id: true,
        },
      }),

      prisma.club.findMany({
        where: {
          ...where,
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

    const clubIds = allMatchingClubIds.map(
      (club) => club.id
    );

    // 6. Métricas agrupadas por club
    const [
      membershipGroups,
      activeMembershipGroups,
      subscriptionGroups,
      facilityGroups,
      activeFacilityGroups,
      planGroups,
      reservationGroups,
      paymentGroups,
      paymentAmounts,
    ] = await prisma.$transaction([
      prisma.clubMembership.groupBy({
        by: ["clubId"],
        where: {
          clubId: { in: clubIds },
        },
        _count: {
          _all: true,
        },
      }),

      prisma.clubMembership.groupBy({
        by: ["clubId"],
        where: {
          clubId: { in: clubIds },
          status: "ACTIVE",
        },
        _count: {
          _all: true,
        },
      }),

      prisma.subscription.groupBy({
        by: ["planId"],
        where: {
          status: "ACTIVE",
          startedAt: { lte: now },
          expiresAt: { gt: now },
          clubMembership: {
            clubId: { in: clubIds },
            status: "ACTIVE",
          },
          plan: {
            isActive: true,
          },
        },
        _count: {
          _all: true,
        },
      }),

      prisma.facility.groupBy({
        by: ["clubId"],
        where: {
          clubId: { in: clubIds },
        },
        _count: {
          _all: true,
        },
      }),

      prisma.facility.groupBy({
        by: ["clubId"],
        where: {
          clubId: { in: clubIds },
          status: "ACTIVE",
        },
        _count: {
          _all: true,
        },
      }),

      prisma.membershipPlan.findMany({
        where: {
          clubId: { in: clubIds },
        },
        select: {
          id: true,
          clubId: true,
          isActive: true,
        },
      }),

      prisma.reservation.groupBy({
        by: ["facilityId", "status"],
        where: {
          facility: {
            clubId: { in: clubIds },
          },
          startAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
        _count: {
          _all: true,
        },
      }),

      prisma.payment.groupBy({
        by: ["clubId"],
        where: {
          clubId: { in: clubIds },
          status: "PAID",
          currency: CURRENCY,
          paidAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
        _count: {
          _all: true,
        },
      }),

      prisma.payment.groupBy({
        by: ["clubId"],
        where: {
          clubId: { in: clubIds },
          status: "PAID",
          currency: CURRENCY,
          paidAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    // 7. Obtener relaciones necesarias
    const facilities = await prisma.facility.findMany({
      where: {
        clubId: { in: clubIds },
      },
      select: {
        id: true,
        clubId: true,
      },
    });

    const facilityToClub = new Map(
      facilities.map(
        (facility) => [
          facility.id,
          facility.clubId,
        ]
      )
    );

    const planToClub = new Map(
      planGroups.map(
        (plan) => [
          plan.id,
          plan.clubId,
        ]
      )
    );

    // 8. Funciones auxiliares
    function countForClub(
      groups: {
        clubId: string;
        _count: { _all: number };
      }[],
      clubId: string
    ) {
      return groups.find(
        (group) => group.clubId === clubId
      )?._count._all ?? 0;
    }

    // 9. Construir estadísticas por club
    const clubsStatistics = allMatchingClubIds.map(
      ({ id: clubId }) => {
        const totalMembers = countForClub(
          membershipGroups,
          clubId
        );

        const activeMembers = countForClub(
          activeMembershipGroups,
          clubId
        );

        const totalFacilities = countForClub(
          facilityGroups,
          clubId
        );

        const activeFacilities = countForClub(
          activeFacilityGroups,
          clubId
        );

        const plans = planGroups.filter(
          (plan) => plan.clubId === clubId
        );

        const activeSubscriptions =
          subscriptionGroups.reduce(
            (total, group) => {
              return planToClub.get(group.planId) === clubId
                ? total + group._count._all
                : total;
            },
            0
          );

        let confirmedReservations = 0;
        let cancelledReservations = 0;

        for (const group of reservationGroups) {
          if (
            facilityToClub.get(group.facilityId) !== clubId
          ) {
            continue;
          }

          if (group.status === "CONFIRMED") {
            confirmedReservations +=
              group._count._all;
          } else if (group.status === "CANCELLED") {
            cancelledReservations +=
              group._count._all;
          }
        }

        const paidPayments = countForClub(
          paymentGroups,
          clubId
        );

        const grossRevenue =
          paymentAmounts.find(
            (group) => group.clubId === clubId
          )?._sum.amount?.toFixed(2) ?? "0.00";

        return {
          clubId,
          totalMembers,
          activeMembers,
          totalPlans: plans.length,
          activePlans: plans.filter(
            (plan) => plan.isActive
          ).length,
          activeSubscriptions,
          totalFacilities,
          activeFacilities,
          confirmedReservations,
          cancelledReservations,
          paidPayments,
          grossRevenue,
        };
      }
    );

    const statisticsByClub = new Map(
      clubsStatistics.map(
        (statistics) => [
          statistics.clubId,
          statistics,
        ]
      )
    );

    // 10. Página de clubes
    const clubs = clubsPage.map((club) => ({
      ...club,
      statistics: statisticsByClub.get(club.id),
    }));

    // 11. Ranking por miembros activos
    const topClubsByMembers = [
      ...clubsStatistics,
    ]
      .sort(
        (a, b) =>
          b.activeMembers - a.activeMembers
      )
      .slice(0, 10)
      .map((statistics) => ({
        ...statistics,
        club: clubsPage.find(
          (club) => club.id === statistics.clubId
        ) ?? null,
      }));

    // 12. Clubes con actividad durante el período
    const activeClubIds = new Set<string>();

    for (const group of paymentGroups) {
      if (group._count._all > 0) {
        activeClubIds.add(group.clubId);
      }
    }

    for (const group of reservationGroups) {
      if (group._count._all === 0) continue;

      const clubId = facilityToClub.get(
        group.facilityId
      );

      if (clubId) {
        activeClubIds.add(clubId);
      }
    }

    // 13. Estados de clubes
    const clubsByStatus = {
      ACTIVE: 0,
      INACTIVE: 0,
      SUSPENDED: 0,
    };

    for (const group of statusGroups) {
      clubsByStatus[group.status] =
        group._count._all;
    }

    // 14. Crecimiento mensual
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

      monthlyGrowth.push({
        year: itemYear,
        month: itemMonth,
        label: monthLabel(itemYear, itemMonth),
        newClubs,
      });
    }

    // 15. Resumen agregado
    const totals = clubsStatistics.reduce(
      (acc, club) => ({
        members: acc.members + club.totalMembers,
        activeMembers:
          acc.activeMembers + club.activeMembers,
        plans: acc.plans + club.totalPlans,
        facilities:
          acc.facilities + club.totalFacilities,
        activeSubscriptions:
          acc.activeSubscriptions +
          club.activeSubscriptions,
        confirmedReservations:
          acc.confirmedReservations +
          club.confirmedReservations,
        paidPayments:
          acc.paidPayments + club.paidPayments,
      }),
      {
        members: 0,
        activeMembers: 0,
        plans: 0,
        facilities: 0,
        activeSubscriptions: 0,
        confirmedReservations: 0,
        paidPayments: 0,
      }
    );

    // 16. Respuesta
    return NextResponse.json({
      success: true,

      period: {
        year,
        month,
        timeZone: TIME_ZONE,
        startAt: periodStart.toISOString(),
        endAtExclusive: periodEnd.toISOString(),
      },

      filters: {
        status: statusParam,
        search: search || null,
      },

      summary: {
        totalClubs: totalMatchingClubs,
        byStatus: clubsByStatus,
        clubsWithActivity: activeClubIds.size,
        clubsWithoutActivity:
          totalMatchingClubs - activeClubIds.size,
        totals,
      },

      pagination: {
        page,
        limit,
        totalItems: totalMatchingClubs,
        totalPages: Math.ceil(
          totalMatchingClubs / limit
        ),
      },

      clubs,
      topClubsByMembers,
      monthlyGrowth,
    });
  } catch (error) {
    console.error(
      "SuperAdmin dashboard clubs error:",
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
