
import { NextResponse } from "next/server";
import { DayOfWeek } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubMembership } from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{ clubId: string }>;
};

const CLUB_TIME_ZONE = "America/Guayaquil";

const DAYS: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function monthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1, 5));
}

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
  };
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function overlapMinutes(
  start: Date,
  end: Date,
  periodStart: Date,
  periodEnd: Date
) {
  const overlapStart = Math.max(
    start.getTime(),
    periodStart.getTime()
  );

  const overlapEnd = Math.min(
    end.getTime(),
    periodEnd.getTime()
  );

  return Math.max(
    0,
    (overlapEnd - overlapStart) / 60000
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Autenticación y autorización
    const user = await requireAuth(request);
    const { clubId } = await context.params;

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

    // 2. Validar club
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

    // 3. Período
    const now = new Date();
    const current = localParts(now);
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

    // 4. Consultar instalaciones y reservas
    const [facilities, reservations, history] =
      await prisma.$transaction([
        prisma.facility.findMany({
          where: { clubId },
          select: {
            id: true,
            name: true,
            status: true,
            schedules: {
              select: {
                dayOfWeek: true,
                openingTime: true,
                closingTime: true,
                isClosed: true,
              },
            },
          },
          orderBy: { name: "asc" },
        }),

        prisma.reservation.findMany({
          where: {
            facility: { clubId },
            startAt: { lt: periodEnd },
            endAt: { gt: periodStart },
          },
          select: {
            facilityId: true,
            status: true,
            startAt: true,
            endAt: true,
          },
        }),

        prisma.reservation.findMany({
          where: {
            facility: { clubId },
            startAt: {
              gte: historyStart,
              lt: periodEnd,
            },
          },
          select: {
            status: true,
            startAt: true,
          },
        }),
      ]);

    // 5. Días del período, en hora de Ecuador
    const daysInMonth = new Date(
      Date.UTC(year, month, 0)
    ).getUTCDate();

    const periodDays: {
      dayOfWeek: DayOfWeek;
      date: string;
    }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        Date.UTC(year, month - 1, day)
      );

      periodDays.push({
        dayOfWeek: DAYS[date.getUTCDay()],
        date: date.toISOString().slice(0, 10),
      });
    }

    // 6. Calcular utilización por instalación
    const facilityStatistics = facilities.map(
      (facility) => {
        const facilityReservations = reservations.filter(
          (reservation) =>
            reservation.facilityId === facility.id
        );

        const confirmed = facilityReservations.filter(
          (reservation) =>
            reservation.status === "CONFIRMED"
        );

        const cancelled = facilityReservations.filter(
          (reservation) =>
            reservation.status === "CANCELLED"
        );

        const reservedMinutes = confirmed.reduce(
          (total, reservation) =>
            total +
            overlapMinutes(
              reservation.startAt,
              reservation.endAt,
              periodStart,
              periodEnd
            ),
          0
        );

        // Capacidad horaria del mes según horarios
        let openingMinutes = 0;

        for (const day of periodDays) {
          const schedules = facility.schedules.filter(
            (schedule) =>
              schedule.dayOfWeek === day.dayOfWeek &&
              !schedule.isClosed
          );

          for (const schedule of schedules) {
            const start = timeToMinutes(
              schedule.openingTime
            );

            const end = timeToMinutes(
              schedule.closingTime
            );

            if (end > start) {
              openingMinutes += end - start;
            }
          }
        }

        const occupancyRate =
          openingMinutes > 0
            ? round2(
                (reservedMinutes / openingMinutes) *
                  100
              )
            : 0;

        return {
          facilityId: facility.id,
          facilityName: facility.name,
          status: facility.status,
          confirmedReservations: confirmed.length,
          cancelledReservations: cancelled.length,
          reservedMinutes,
          reservedHours: round2(
            reservedMinutes / 60
          ),
          openingMinutes,
          openingHours: round2(
            openingMinutes / 60
          ),
          occupancyRate,
        };
      }
    );

    // 7. Resumen general
    const totalConfirmed =
      facilityStatistics.reduce(
        (total, facility) =>
          total + facility.confirmedReservations,
        0
      );

    const totalCancelled =
      facilityStatistics.reduce(
        (total, facility) =>
          total + facility.cancelledReservations,
        0
      );

    const totalReservedMinutes =
      facilityStatistics.reduce(
        (total, facility) =>
          total + facility.reservedMinutes,
        0
      );

    const totalOpeningMinutes =
      facilityStatistics.reduce(
        (total, facility) =>
          total + facility.openingMinutes,
        0
      );

    const overallOccupancyRate =
      totalOpeningMinutes > 0
        ? round2(
            (totalReservedMinutes /
              totalOpeningMinutes) *
              100
          )
        : 0;

    // 8. Ranking de instalaciones
    const mostUsedFacilities = [
      ...facilityStatistics,
    ]
      .sort(
        (a, b) =>
          b.reservedMinutes - a.reservedMinutes
      )
      .slice(0, 5);

    // 9. Distribución por hora
    const reservationsByHour = Array.from(
      { length: 24 },
      (_, hour) => ({
        hour: `${String(hour).padStart(2, "0")}:00`,
        reservations: 0,
      })
    );

    for (const reservation of reservations) {
      if (reservation.status !== "CONFIRMED") {
        continue;
      }

      // Contar únicamente reservas que empiezan
      // dentro del período seleccionado.
      if (
        reservation.startAt < periodStart ||
        reservation.startAt >= periodEnd
      ) {
        continue;
      }

      const local = localParts(reservation.startAt);

      reservationsByHour[local.hour].reservations++;
    }

    // 10. Evolución mensual
    const monthlyReservations = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(
        Date.UTC(year, month - 1 - i, 1)
      );

      const itemYear = date.getUTCFullYear();
      const itemMonth = date.getUTCMonth() + 1;

      const matching = history.filter(
        (reservation) => {
          const local = localParts(
            reservation.startAt
          );

          return (
            local.year === itemYear &&
            local.month === itemMonth
          );
        }
      );

      monthlyReservations.push({
        year: itemYear,
        month: itemMonth,
        label:
          `${itemYear}-${String(itemMonth).padStart(2, "0")}`,
        confirmed: matching.filter(
          (reservation) =>
            reservation.status === "CONFIRMED"
        ).length,
        cancelled: matching.filter(
          (reservation) =>
            reservation.status === "CANCELLED"
        ).length,
      });
    }

    // 11. Respuesta
    return NextResponse.json({
      success: true,
      club,

      period: {
        year,
        month,
        timeZone: CLUB_TIME_ZONE,
        startAt: periodStart.toISOString(),
        endAtExclusive: periodEnd.toISOString(),
      },

      summary: {
        totalFacilities: facilities.length,
        activeFacilities: facilities.filter(
          (facility) =>
            facility.status === "ACTIVE"
        ).length,
        inactiveFacilities: facilities.filter(
          (facility) =>
            facility.status === "INACTIVE"
        ).length,
        confirmedReservations: totalConfirmed,
        cancelledReservations: totalCancelled,
        totalReservations:
          totalConfirmed + totalCancelled,
        reservedMinutes: totalReservedMinutes,
        reservedHours: round2(
          totalReservedMinutes / 60
        ),
        openingMinutes: totalOpeningMinutes,
        openingHours: round2(
          totalOpeningMinutes / 60
        ),
        occupancyRate: overallOccupancyRate,
      },

      facilities: facilityStatistics,
      mostUsedFacilities,
      reservationsByHour,
      monthlyReservations,
    });
  } catch (error) {
    console.error(
      "Club dashboard reservations error:",
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
