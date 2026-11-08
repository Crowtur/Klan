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
import { DayOfWeek } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubMembership } from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{
    clubId: string;
    facilityId: string;
  }>;
};

type TimeInterval = {
  start: string;
  end: string;
};

type BookingSlot = {
  start: string;
  end: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
};



const DAYS: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

// Convierte HH:mm a minutos desde medianoche.
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Convierte minutos desde medianoche a HH:mm.
function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}`;
}

// Obtiene la fecha local de un instante UTC.
function getLocalDateTime(date: Date,timeZone:string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

// Resta los intervalos ocupados de los horarios abiertos.
/** Divide cada ventana abierta en los tramos que quedan libres después de descontar reservas. */
function subtractOccupiedIntervals(
  openingIntervals: TimeInterval[],
  occupiedIntervals: TimeInterval[]
): TimeInterval[] {
  const availableIntervals: TimeInterval[] = [];

  for (const opening of openingIntervals) {
    const openingStart = timeToMinutes(opening.start);
    const openingEnd = timeToMinutes(opening.end);

    let cursor = openingStart;

    const relevantOccupied = occupiedIntervals
      .map((occupied) => ({
        start: Math.max(
          openingStart,
          timeToMinutes(occupied.start)
        ),
        end: Math.min(
          openingEnd,
          timeToMinutes(occupied.end)
        ),
      }))
      .filter((occupied) => occupied.start < occupied.end)
      .sort((a, b) => a.start - b.start);

    for (const occupied of relevantOccupied) {
      if (occupied.start > cursor) {
        availableIntervals.push({
          start: minutesToTime(cursor),
          end: minutesToTime(occupied.start),
        });
      }

      cursor = Math.max(cursor, occupied.end);
    }

    if (cursor < openingEnd) {
      availableIntervals.push({
        start: minutesToTime(cursor),
        end: minutesToTime(openingEnd),
      });
    }
  }

  return availableIntervals;
}

// Genera los bloques de horario seleccionables alineados a la cuadrícula.
/** Genera horas de inicio únicamente cuando la duración completa cabe en el intervalo libre. */
function generateBookingSlots(
  availableIntervals: TimeInterval[],
  date: string,
  durationMinutes: number,
  stepMinutes: number,
  now: Date, timeZone:string
): BookingSlot[] {
  const slots: BookingSlot[] = [];

  // America/Guayaquil (UTC-05:00)
  const offset = timeZone==="Pacific/Galapagos"?"-06:00":"-05:00";

  const localNow = getLocalDateTime(now,timeZone);
  const isToday = localNow.date === date;

  const currentMinute = isToday
    ? timeToMinutes(localNow.time)
    : 0;

  for (const interval of availableIntervals) {
    const intervalStart = timeToMinutes(interval.start);
    const intervalEnd = timeToMinutes(interval.end);

    // Alinear los posibles inicios a la cuadrícula del día
    const firstStart =
      Math.ceil(intervalStart / stepMinutes) *
      stepMinutes;

    for (
      let start = firstStart;
      start + durationMinutes <= intervalEnd;
      start += stepMinutes
    ) {
      // Omitir horarios pasados del día actual
      if (isToday && start <= currentMinute) {
        continue;
      }

      const end = start + durationMinutes;

      const startTime = minutesToTime(start);
      const endTime = minutesToTime(end);

      const startAt = new Date(
        `${date}T${startTime}:00${offset}`
      );

      const endAt = new Date(
        startAt.getTime() +
          durationMinutes * 60 * 1000
      );

      slots.push({
        start: startTime,
        end: endTime,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        durationMinutes,
      });
    }
  }

  return slots;
}

/** Resta los intervalos ocupados del horario de apertura y calcula las opciones para la duración solicitada. */
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Autenticación
    const user = await requireAuth(request);

    const { clubId, facilityId } = await context.params;

    // 2. Validar y conservar membresía en el club
    const membership = await requireClubMembership(
      user.id,
      clubId
    );

    // 3. Obtener fecha solicitada y parámetros
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const durationParam =
      searchParams.get("duration") ?? "60";
    const stepParam =
      searchParams.get("step") ?? "30";

    const durationMinutes = Number(durationParam);
    const stepMinutes = Number(stepParam);

    if (
      !dateParam ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Debes proporcionar una fecha válida en formato YYYY-MM-DD",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 15 ||
      durationMinutes > 1440
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "duration debe ser un número entero entre 15 y 1440 minutos",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(stepMinutes) ||
      stepMinutes < 5 ||
      stepMinutes > 120
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "step debe ser un número entero entre 5 y 120 minutos",
        },
        { status: 400 }
      );
    }

    // 4. Interpretar fecha como día local de Ecuador (UTC-05:00)
    const timeZone=membership.club.timeZone;
    const dayStart = new Date(
      `${dateParam}T00:00:00${timeZone==="Pacific/Galapagos"?"-06:00":"-05:00"}`
    );

    if (
      !Number.isFinite(dayStart.getTime()) ||
      getLocalDateTime(dayStart,timeZone).date !== dateParam
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "La fecha indicada no existe",
        },
        { status: 400 }
      );
    }

    const nextDayStart = new Date(
      dayStart.getTime() + 24 * 60 * 60 * 1000
    );

    // 5. Determinar día de la semana
    const [year, month, day] = dateParam
      .split("-")
      .map(Number);

    const dayOfWeek = DAYS[
      new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    ];

    // 6. Validar instalación activa y perteneciente al club
    const facility = await prisma.facility.findFirst({
      where: {
        id: facilityId,
        clubId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!facility) {
      return NextResponse.json(
        {
          success: false,
          message: "Instalación no encontrada o inactiva",
        },
        { status: 404 }
      );
    }

    // 7. Obtener horarios de apertura
    const schedules = await prisma.facilitySchedule.findMany({
      where: {
        facilityId,
        dayOfWeek,
        isClosed: false,
      },
      select: {
        openingTime: true,
        closingTime: true,
      },
      orderBy: {
        openingTime: "asc",
      },
    });

    const openingIntervals: TimeInterval[] =
      schedules.map((schedule) => ({
        start: schedule.openingTime,
        end: schedule.closingTime,
      }));

    // 8. Obtener reservas confirmadas del día
    const reservations = await prisma.reservation.findMany({
      where: {
        facilityId,
        status: "CONFIRMED",
        startAt: {
          lt: nextDayStart,
        },
        endAt: {
          gt: dayStart,
        },
      },
      select: {
        startAt: true,
        endAt: true,
      },
      orderBy: {
        startAt: "asc",
      },
    });

    // 9. Convertir reservas a intervalos locales recortados al día
    const occupiedIntervals: TimeInterval[] =
      reservations.map((reservation) => {
        const clippedStart = new Date(
          Math.max(
            reservation.startAt.getTime(),
            dayStart.getTime()
          )
        );

        const clippedEnd = new Date(
          Math.min(
            reservation.endAt.getTime(),
            nextDayStart.getTime()
          )
        );

        return {
          start: getLocalDateTime(clippedStart,timeZone).time,
          end:
            clippedEnd.getTime() === nextDayStart.getTime()
              ? "24:00"
              : getLocalDateTime(clippedEnd,timeZone).time,
        };
      });

    // 10. Calcular intervalos libres
    const availableIntervals = subtractOccupiedIntervals(
      openingIntervals,
      occupiedIntervals
    );

    // 11. Consultar suscripciones vigentes del socio
    const now = new Date();

    const activeSubscriptions =
      await prisma.subscription.findMany({
        where: {
          clubMembershipId: membership.id,
          status: "ACTIVE",
          startedAt: {
            lte: now,
          },
          expiresAt: {
            gt: now,
          },
          plan: {
            clubId,
            isActive: true,
          },
        },
        select: {
          id: true,
          planId: true, expiresAt:true,
        },
      });

    const activePlanIds = activeSubscriptions.map(
      (subscription) => subscription.planId
    );

    // 12. Consultar qué planes permiten utilizar esta instalación
    const planAccesses =
      activePlanIds.length > 0
        ? await prisma.facilityPlanAccess.findMany({
            where: {
              facilityId,
              membershipPlanId: {
                in: activePlanIds,
              },
            },
            select: {
              membershipPlanId: true,
              maxReservationMinutesPerDay: true,
            },
          })
        : [];

    // Mayor límite disponible entre los planes autorizados
    const maxMinutesPerDay = membership.role === "CLUB_ADMIN" ? 1440 :
      planAccesses.length > 0
        ? Math.max(
            ...planAccesses.map(
              (access) => access.maxReservationMinutesPerDay
            )
          )
        : 0;

    const hasActiveSubscription = activeSubscriptions.length > 0;
    const hasFacilityAccess = membership.role === "CLUB_ADMIN" || planAccesses.length > 0;

    // 13. Calcular minutos confirmados del socio para esta instalación y fecha
    const memberReservations =
      await prisma.reservation.findMany({
        where: {
          facilityId,
          clubMembershipId: membership.id,
          status: "CONFIRMED",
          startAt: {
            lt: nextDayStart,
          },
          endAt: {
            gt: dayStart,
          },
        },
        select: {
          startAt: true,
          endAt: true,
        },
      });

    const usedMinutes = memberReservations.reduce(
      (total, reservation) => {
        const overlapStart = Math.max(
          reservation.startAt.getTime(),
          dayStart.getTime()
        );

        const overlapEnd = Math.min(
          reservation.endAt.getTime(),
          nextDayStart.getTime()
        );

        return (
          total +
          Math.max(
            0,
            (overlapEnd - overlapStart) / 60000
          )
        );
      },
      0
    );

    // 14. Minutos disponibles para nuevas reservas
    const remainingMinutes = Math.max(
      0,
      maxMinutesPerDay - usedMinutes
    );

    const canReserve = !!membership.id &&
      (membership.role === "CLUB_ADMIN" || hasActiveSubscription) &&
      hasFacilityAccess &&
      remainingMinutes > 0;

    // 15. Generar horarios seleccionables
    const requestedDateIsPast =
      nextDayStart.getTime() <= now.getTime();

    const hasEnoughMinutes =
      remainingMinutes >= durationMinutes;

    const bookingSlots =
      canReserve &&
      hasEnoughMinutes &&
      !requestedDateIsPast
        ? generateBookingSlots(
            availableIntervals,
            dateParam,
            durationMinutes,
            stepMinutes,
            now,timeZone
          ).filter(slot=>membership.role==="CLUB_ADMIN"||activeSubscriptions.some(s=>s.expiresAt && +s.expiresAt>=Date.parse(slot.endAt) && planAccesses.some(access=>access.membershipPlanId===s.planId && access.maxReservationMinutesPerDay>=usedMinutes+durationMinutes)))
        : [];

    // 16. Respuesta completa con bookingOptions
    return NextResponse.json({
      success: true,
      date: dateParam,
      dayOfWeek,
      timeZone,
      facility,

      availability: {
        openingIntervals,
        occupiedIntervals,
        availableIntervals,
      },

      membershipAccess: {
        hasActiveSubscription,
        hasFacilityAccess,
        canReserve,
        eligiblePlanIds: planAccesses.map(
          (access) => access.membershipPlanId
        ),
      },

      membershipLimits: {
        maxMinutesPerDay,
        usedMinutes,
        remainingMinutes,
      },

      bookingOptions: {
        durationMinutes,
        stepMinutes,
        total: bookingSlots.length,
        slots: bookingSlots,
      },
    });
  } catch (error) {
    console.error("Get facility availability error:", error);

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