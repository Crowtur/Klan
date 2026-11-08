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
import { requireClubMembership } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";
import { DayOfWeek, Prisma } from "@prisma/client";

// Configuración de zona horaria y mapeo de días


const dayNames: Record<string, DayOfWeek> = {
  Mon: "MONDAY",
  Tue: "TUESDAY",
  Wed: "WEDNESDAY",
  Thu: "THURSDAY",
  Fri: "FRIDAY",
  Sat: "SATURDAY",
  Sun: "SUNDAY",
};

/**
 * Clase de error personalizada para transacciones de reserva.
 */
class ReservationError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ReservationError";
  }
}

/**
 * Convierte una fecha UTC al día y hora local en la zona horaria del club.
 */
function getLocalDateTime(date: Date,timeZone:string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    dayOfWeek: dayNames[values.weekday],
    time: `${values.hour}:${values.minute}`,
  };
}

// ==========================================
// 1. Manejador GET (Listar reservas de una instalación)
// ==========================================
/** Consulta las reservas de la instalación con la visibilidad correspondiente al usuario. */
export async function GET(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      facilityId: string;
    }>;
  }
) {
  try {
    // 1. Autenticación
    const user = await requireAuth(request);

    const { clubId, facilityId } = await context.params;

    // 2. Validar pertenencia al club
    const membership = await requireClubMembership(user.id, clubId);

    // 3. Comprobar que la instalación pertenece al club
    const facility = await prisma.facility.findFirst({
      where: {
        id: facilityId,
        clubId,
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
          message: "Instalación no encontrada",
        },
        { status: 404 }
      );
    }

    // 4. Leer filtros opcionales
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (
      status !== null &&
      status !== "CONFIRMED" &&
      status !== "CANCELLED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Estado de reserva inválido",
        },
        { status: 400 }
      );
    }

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    if (
      (fromDate && !Number.isFinite(fromDate.getTime())) ||
      (toDate && !Number.isFinite(toDate.getTime()))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Filtros de fecha inválidos",
        },
        { status: 400 }
      );
    }

    if (fromDate && toDate && fromDate >= toDate) {
      return NextResponse.json(
        {
          success: false,
          message: "El filtro from debe ser anterior a to",
        },
        { status: 400 }
      );
    }

    // 5. Construir filtros de consulta
    const where: Prisma.ReservationWhereInput = {
      facilityId,
      ...(membership.role !== "CLUB_ADMIN"
        ? { clubMembershipId: membership.id }
        : {}),
      ...(status ? { status: status as Prisma.EnumReservationStatusFilter | "CONFIRMED" | "CANCELLED" } : {}),
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

    // 6. Consultar reservas
    const reservations = await prisma.reservation.findMany({
      where,
      select: {
        id: true,
        facilityId: true,
        clubMembershipId: true,
        ...(membership.role==="CLUB_ADMIN" && {clubMembership:{select:{user:{select:{id:true,firstName:true,lastName:true,avatarUrl:true}}}}}),
        startAt: true,
        endAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        startAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      facility,
      reservations,
      total: reservations.length,
    });
  } catch (error) {
    console.error("Get facility reservations error:", error);

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
              "No tienes permisos para consultar reservas de este club",
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

// ==========================================
// 2. Manejador POST (Creación de reserva)
// ==========================================
/** Comprueba permisos, disponibilidad y límites antes de insertar la reserva en una transacción. */
export async function POST(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      facilityId: string;
    }>;
  }
) {
  try {
    // 1. Autenticación
    const user = await requireAuth(request);

    const { clubId, facilityId } = await context.params;

    // 2. Membresía activa y club activo
    const membership = await requireClubMembership(user.id, clubId);
    if(!membership.id)return NextResponse.json({success:false,message:"La visita administrativa no crea una membresía. Necesitas una membresía propia para reservar."},{status:403});

    // 3. Instalación válida y activa
    const facility = await prisma.facility.findFirst({
      where: {
        id: facilityId,
        clubId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
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

    // 4. Buscar suscripción vigente
    const now = new Date();

    const activeSubscriptions = await prisma.subscription.findMany({
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
        planId: true,
        expiresAt: true,
      },
    });

    if (membership.role !== "CLUB_ADMIN" && activeSubscriptions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No tienes una suscripción vigente. No puedes reservar instalaciones durante el período de gracia.",
        },
        { status: 403 }
      );
    }

    // 5. Verificar acceso de los planes vigentes
    const planIds = activeSubscriptions.map(
      (subscription) => subscription.planId
    );

    const planAccesses = await prisma.facilityPlanAccess.findMany({
      where: {
        facilityId,
        membershipPlanId: {
          in: planIds,
        },
      },
      select: {
        membershipPlanId: true,
        maxReservationMinutesPerDay: true,
      },
    });

    if (membership.role !== "CLUB_ADMIN" && planAccesses.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tu plan de membresía no permite reservar esta instalación",
        },
        { status: 403 }
      );
    }

    // 6. Leer y validar las fechas solicitadas
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "El cuerpo de la solicitud debe ser un JSON válido",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      !("startAt" in body) ||
      !("endAt" in body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Debes proporcionar startAt y endAt",
        },
        { status: 400 }
      );
    }

    const { startAt, endAt } = body;

    // Exigir ISO 8601 con zona horaria explícita
    const isoDateTimeRegex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

    if (
      typeof startAt !== "string" ||
      typeof endAt !== "string" ||
      !isoDateTimeRegex.test(startAt) ||
      !isoDateTimeRegex.test(endAt)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Las fechas deben utilizar ISO 8601 con zona horaria explícita",
        },
        { status: 400 }
      );
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (
      !Number.isFinite(startDate.getTime()) ||
      !Number.isFinite(endDate.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Las fechas proporcionadas no son válidas",
        },
        { status: 400 }
      );
    }

    if (startDate <= now) {
      return NextResponse.json(
        {
          success: false,
          message: "No puedes reservar fechas pasadas",
        },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La fecha de finalización debe ser posterior a la de inicio",
        },
        { status: 400 }
      );
    }

    const durationMinutes =
      (endDate.getTime() - startDate.getTime()) / 60000;

    if (!Number.isInteger(durationMinutes)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La duración debe expresarse en minutos completos",
        },
        { status: 400 }
      );
    }

    // 7. Convertir las fechas a la zona horaria del club
    const localStart = getLocalDateTime(startDate,membership.club.timeZone);
    const localEnd = getLocalDateTime(endDate,membership.club.timeZone);

    // No permitir reservas que atraviesen días
    if (localStart.date !== localEnd.date) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La reserva debe comenzar y terminar el mismo día",
        },
        { status: 400 }
      );
    }

    // 8. Consultar horarios de funcionamiento
    const schedules = await prisma.facilitySchedule.findMany({
      where: {
        facilityId,
        dayOfWeek: localStart.dayOfWeek,
        isClosed: false,
      },
      select: {
        openingTime: true,
        closingTime: true,
      },
    });

    if (schedules.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La instalación no está disponible este día",
        },
        { status: 400 }
      );
    }

    // La reserva debe caber completamente dentro de un único intervalo de apertura
    const isWithinSchedule = schedules.some(
      (schedule) =>
        localStart.time >= schedule.openingTime &&
        localEnd.time <= schedule.closingTime
    );

    if (!isWithinSchedule) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La reserva está fuera del horario de funcionamiento",
        },
        { status: 400 }
      );
    }

    // 9. Verificar el máximo permitido por el plan
    const maxAllowedMinutes = membership.role === "CLUB_ADMIN" ? 1440 : Math.max(
      ...planAccesses.map(
        (access) => access.maxReservationMinutesPerDay
      )
    );

    if (durationMinutes > maxAllowedMinutes) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Tu plan permite un máximo de ${maxAllowedMinutes} minutos diarios para esta instalación`,
        },
        { status: 400 }
      );
    }

    // 10. Límites del día local
    const dayStart = new Date(
      `${localStart.date}T00:00:00${membership.club.timeZone==="Pacific/Galapagos"?"-06:00":"-05:00"}`
    );

    const nextDayStart = new Date(
      dayStart.getTime() + 24 * 60 * 60 * 1000
    );

    // 11. Crear la reserva dentro de una transacción con bloqueo
    const reservation = await prisma.$transaction(
      async (tx) => {
        // Bloquear la fila de la instalación
        const lockedFacilities = await tx.$queryRaw<
          { id: string }[]
        >`
          SELECT "id"
          FROM "Facility"
          WHERE "id" = ${facilityId}
            AND "clubId" = ${clubId}
            AND "status" = 'ACTIVE'
          FOR UPDATE
        `;

        if (lockedFacilities.length === 0) {
          throw new ReservationError(
            404,
            "La instalación ya no está disponible"
          );
        }

        // Revalidar la membresía y el estado del club
        const currentMembership =
          await tx.clubMembership.findFirst({
            where: {
              id: membership.id,
              userId: user.id,
              clubId,
              status: "ACTIVE",
              club: {
                status: "ACTIVE",
              },
            },
            select: {
              id: true, role: true,
            },
          });

        if (!currentMembership) {
          throw new ReservationError(
            403,
            "Tu membresía ya no permite realizar reservas"
          );
        }

        // Revalidar las suscripciones vigentes
        const transactionNow = new Date();

        const currentSubscriptions =
          await tx.subscription.findMany({
            where: {
              clubMembershipId: membership.id,
              status: "ACTIVE",
              startedAt: {
                lte: transactionNow,
              },
              expiresAt: {
                gte: endDate,
              },
              plan: {
                clubId,
                isActive: true,
              },
            },
            select: {
              planId: true,
            },
          });

        if (currentMembership.role !== "CLUB_ADMIN" && currentSubscriptions.length === 0) {
          throw new ReservationError(
            403,
            "No tienes una suscripción vigente"
          );
        }

        const currentPlanIds = currentSubscriptions.map(
          (subscription) => subscription.planId
        );

        // Revalidar el acceso a la instalación
        const currentPlanAccesses =
          await tx.facilityPlanAccess.findMany({
            where: {
              facilityId,
              membershipPlanId: {
                in: currentPlanIds,
              },
            },
            select: {
              maxReservationMinutesPerDay: true,
            },
          });

        if (currentMembership.role !== "CLUB_ADMIN" && currentPlanAccesses.length === 0) {
          throw new ReservationError(
            403,
            "Tu plan ya no permite reservar esta instalación"
          );
        }

        const currentMaxAllowedMinutes = currentMembership.role === "CLUB_ADMIN" ? 1440 : Math.max(
          ...currentPlanAccesses.map(
            (access) => access.maxReservationMinutesPerDay
          )
        );

        if (durationMinutes > currentMaxAllowedMinutes) {
          throw new ReservationError(
            400,
            "La duración supera el límite de tu plan"
          );
        }

        // Revalidar los horarios
        const currentSchedules =
          await tx.facilitySchedule.findMany({
            where: {
              facilityId,
              dayOfWeek: localStart.dayOfWeek,
              isClosed: false,
            },
            select: {
              openingTime: true,
              closingTime: true,
            },
          });

        const stillWithinSchedule = currentSchedules.some(
          (schedule) =>
            localStart.time >= schedule.openingTime &&
            localEnd.time <= schedule.closingTime
        );

        if (!stillWithinSchedule) {
          throw new ReservationError(
            400,
            "El horario de la instalación ha cambiado"
          );
        }

        // Calcular minutos utilizados acumulados
        const existingReservations =
          await tx.reservation.findMany({
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

        const usedMinutes = existingReservations.reduce(
          (total, existing) => {
            const overlapStart = Math.max(
              existing.startAt.getTime(),
              dayStart.getTime()
            );

            const overlapEnd = Math.min(
              existing.endAt.getTime(),
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

        if (
          usedMinutes + durationMinutes >
          currentMaxAllowedMinutes
        ) {
          throw new ReservationError(
            400,
            `Límite diario superado. Has utilizado ${usedMinutes} de ${currentMaxAllowedMinutes} minutos`
          );
        }

        // Comprobar solapamientos
        const conflict = await tx.reservation.findFirst({
          where: {
            facilityId,
            status: "CONFIRMED",
            startAt: {
              lt: endDate,
            },
            endAt: {
              gt: startDate,
            },
          },
          select: {
            id: true,
          },
        });

        if (conflict) {
          throw new ReservationError(
            409,
            "La instalación ya está reservada en ese horario"
          );
        }

        // Crear la reserva
        const booking=await tx.reservation.create({
          data: {
            facilityId,
            clubMembershipId: membership.id,
            startAt: startDate,
            endAt: endDate,
            status: "CONFIRMED",
          },
        });
        await tx.notification.create({data:{clubId,recipientId:user.id,entityType:"reservation",entityId:booking.id,eventKey:"reserved:"+booking.id,type:"RESERVATION_CREATED",title:"Reserva confirmada",targetPath:"/app?view=club&club="+clubId}});
        return booking;
      },
      {
        maxWait: 10000,
        timeout: 15000,
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Reserva creada correctamente",
        reservation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Reservation creation error:", error);

    if (error instanceof ReservationError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes("23P01")
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La instalación ya fue reservada en ese horario",
        },
        { status: 409 }
      );
    }

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
              "No tienes permisos para realizar acciones en este club",
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