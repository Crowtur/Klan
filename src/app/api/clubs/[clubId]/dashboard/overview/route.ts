
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubMembership } from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{
    clubId: string;
  }>;
};

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
        status: true,
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

    // 4. Período: mes actual en Ecuador, por defecto
    const { searchParams } = new URL(request.url);

    const now = new Date();

    const currentYear = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Guayaquil",
        year: "numeric",
      }).format(now)
    );

    const currentMonth = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Guayaquil",
        month: "numeric",
      }).format(now)
    );

    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const year =
      yearParam === null
        ? currentYear
        : Number(yearParam);

    const month =
      monthParam === null
        ? currentMonth
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

    // Límites del mes local convertidos a UTC.
    const periodStart = new Date(
      Date.UTC(year, month - 1, 1, 5, 0, 0)
    );

    const periodEnd = new Date(
      Date.UTC(year, month, 1, 5, 0, 0)
    );

    // 5. Consultas agregadas
    const [
      totalMembers,
      activeMembers,
      activeSubscriptions,
      confirmedReservations,
      cancelledReservations,
      paidPayments,
      paidAmount,
    ] = await prisma.$transaction([
      prisma.clubMembership.count({
        where: { clubId },
      }),

      prisma.clubMembership.count({
        where: {
          clubId,
          status: "ACTIVE",
        },
      }),

      prisma.subscription.count({
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
      }),

      prisma.reservation.count({
        where: {
          status: "CONFIRMED",
          startAt: {
            gte: periodStart,
            lt: periodEnd,
          },
          facility: { clubId },
        },
      }),

      prisma.reservation.count({
        where: {
          status: "CANCELLED",
          startAt: {
            gte: periodStart,
            lt: periodEnd,
          },
          facility: { clubId },
        },
      }),

      prisma.payment.count({
        where: {
          clubId,
          status: "PAID",
          paidAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
      }),

      prisma.payment.aggregate({
        where: {
          clubId,
          status: "PAID",
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

    // Decimal de Prisma: conversión para JSON.
    // Suponemos USD, como en el MVP actual.
    const grossRevenue = Number(
      paidAmount._sum.amount?.toString() ?? "0"
    );

    return NextResponse.json({
      success: true,
      club,
      period: {
        year,
        month,
        timeZone: "America/Guayaquil",
        startAt: periodStart.toISOString(),
        endAtExclusive: periodEnd.toISOString(),
      },
      members: {
        total: totalMembers,
        active: activeMembers,
        inactive: totalMembers - activeMembers,
      },
      subscriptions: {
        active: activeSubscriptions,
      },
      reservations: {
        confirmed: confirmedReservations,
        cancelled: cancelledReservations,
        total:
          confirmedReservations + cancelledReservations,
      },
      finances: {
        currency: "USD",
        paidPayments,
        grossRevenue,
      },
    });
  } catch (error) {
    console.error("Club dashboard overview error:", error);

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
