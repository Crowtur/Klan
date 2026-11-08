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
import { NextResponse } from "next/server";
import { DayOfWeek } from "@prisma/client";

const validDays: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function isValidTime(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  );
}

/** Valida los intervalos semanales y sustituye el horario de la instalación. */
export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      facilityId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);
    const { clubId, facilityId } = await context.params;

    const membership = await prisma.clubMembership.findFirst({
      where: {
        clubId,
        userId: user.id,
        role: "CLUB_ADMIN",
        status: "ACTIVE",
      },
    });

    if (!membership && user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "No tienes permisos para configurar los horarios de esta instalación",
        },
        { status: 403 }
      );
    }

    const facility = await prisma.facility.findFirst({
      where: {
        id: facilityId,
        clubId,
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

    const body = await request.json();

    if (!Array.isArray(body.schedule)) {
      return NextResponse.json(
        {
          success: false,
          message: "El campo schedule debe ser un arreglo",
        },
        { status: 400 }
      );
    }

    const schedulesByDay = new Map<
      DayOfWeek,
      {
        openingTime: string;
        closingTime: string;
      }[]
    >();

    for (const item of body.schedule) {
      if (!validDays.includes(item.dayOfWeek as DayOfWeek)) {
        return NextResponse.json(
          {
            success: false,
            message: `Día de la semana inválido: ${item.dayOfWeek}`,
          },
          { status: 400 }
        );
      }

      if (
        !isValidTime(item.openingTime) ||
        !isValidTime(item.closingTime)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Horario inválido para ${item.dayOfWeek}. Usa el formato HH:mm`,
          },
          { status: 400 }
        );
      }

      if (item.openingTime >= item.closingTime) {
        return NextResponse.json(
          {
            success: false,
            message: `La hora de apertura debe ser anterior a la hora de cierre para ${item.dayOfWeek}`,
          },
          { status: 400 }
        );
      }

      const day = item.dayOfWeek as DayOfWeek;

      if (!schedulesByDay.has(day)) {
        schedulesByDay.set(day, []);
      }

      schedulesByDay.get(day)!.push({
        openingTime: item.openingTime,
        closingTime: item.closingTime,
      });
    }

    for (const [day, intervals] of schedulesByDay.entries()) {
      intervals.sort((a, b) =>
        a.openingTime.localeCompare(b.openingTime)
      );

      for (let i = 1; i < intervals.length; i++) {
        const previous = intervals[i - 1];
        const current = intervals[i];

        if (current.openingTime < previous.closingTime) {
          return NextResponse.json(
            {
              success: false,
              message: `Los horarios de ${day} se superponen`,
            },
            { status: 400 }
          );
        }
      }
    }

    const scheduleData: {
      facilityId: string;
      dayOfWeek: DayOfWeek;
      openingTime: string;
      closingTime: string;
      intervalOrder: number;
      isClosed: boolean;
    }[] = [];

    for (const [day, intervals] of schedulesByDay.entries()) {
      intervals.sort((a, b) =>
        a.openingTime.localeCompare(b.openingTime)
      );

      intervals.forEach((interval, index) => {
        scheduleData.push({
          facilityId,
          dayOfWeek: day,
          openingTime: interval.openingTime,
          closingTime: interval.closingTime,
          intervalOrder: index + 1,
          isClosed: false,
        });
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.facilitySchedule.deleteMany({
        where: {
          facilityId,
        },
      });

      if (scheduleData.length > 0) {
        await tx.facilitySchedule.createMany({
          data: scheduleData,
        });
      }
    });

    const schedules = await prisma.facilitySchedule.findMany({
      where: {
        facilityId,
      },
      orderBy: [
        {
          dayOfWeek: "asc",
        },
        {
          intervalOrder: "asc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Horarios configurados correctamente",
      facilityId,
      schedules,
    });
  } catch (error) {
    console.error("Configure facility schedule error:", error);

    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado",
        },
        { status: 401 }
      );
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


/** Recupera los intervalos de apertura que configuran la disponibilidad. */
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
    const user = await requireAuth(request);

    const { clubId, facilityId } = await context.params;

    const membership = await prisma.clubMembership.findFirst({
      where: {
        clubId,
        userId: user.id,
        status: "ACTIVE",
      },
    });

    if (!membership && user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "No perteneces a este club",
        },
        { status: 403 }
      );
    }

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

    const schedules = await prisma.facilitySchedule.findMany({
      where: {
        facilityId,
      },
      orderBy: [
        {
          dayOfWeek: "asc",
        },
        {
          intervalOrder: "asc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      facility,
      schedules,
    });
  } catch (error) {
    console.error("Get facility schedule error:", error);

    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado",
        },
        { status: 401 }
      );
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