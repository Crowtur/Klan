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

/** Actualiza qué planes pueden reservar la instalación y su límite diario. */
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
            "No tienes permisos para configurar los planes de esta instalación",
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

    if (!Array.isArray(body.planAccesses)) {
      return NextResponse.json(
        {
          success: false,
          message: "El campo planAccesses debe ser un arreglo",
        },
        { status: 400 }
      );
    }

    const planIds = new Set<string>();

    for (const item of body.planAccesses) {
      if (
        typeof item.membershipPlanId !== "string" ||
        !item.membershipPlanId.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Cada acceso debe incluir un membershipPlanId válido",
          },
          { status: 400 }
        );
      }

      if (planIds.has(item.membershipPlanId)) {
        return NextResponse.json(
          {
            success: false,
            message: "No puedes repetir un plan en la configuración",
          },
          { status: 400 }
        );
      }

      planIds.add(item.membershipPlanId);

      if (
        !Number.isInteger(item.maxReservationMinutesPerDay) ||
        item.maxReservationMinutesPerDay <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "maxReservationMinutesPerDay debe ser un entero mayor que 0",
          },
          { status: 400 }
        );
      }
    }

    if (planIds.size > 0) {
      const plans = await prisma.membershipPlan.findMany({
        where: {
          id: {
            in: [...planIds],
          },
          clubId,
        },
        select: {
          id: true,
        },
      });

      if (plans.length !== planIds.size) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Uno o más planes no existen o no pertenecen a este club",
          },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.facilityPlanAccess.deleteMany({
        where: {
          facilityId,
        },
      });

      if (body.planAccesses.length > 0) {
        await tx.facilityPlanAccess.createMany({
          data: body.planAccesses.map(
            (item: {
              membershipPlanId: string;
              maxReservationMinutesPerDay: number;
            }) => ({
              facilityId,
              membershipPlanId: item.membershipPlanId,
              maxReservationMinutesPerDay:
                item.maxReservationMinutesPerDay,
            })
          ),
        });
      }
    });

    const planAccesses = await prisma.facilityPlanAccess.findMany({
      where: {
        facilityId,
      },
      include: {
        membershipPlan: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Accesos de membresías configurados correctamente",
      facilityId,
      planAccesses,
    });
  } catch (error) {
    console.error("Configure facility plan access error:", error);

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


/** Recupera los permisos por plan que el editor usa como valores iniciales. */
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

    const planAccesses = await prisma.facilityPlanAccess.findMany({
      where: {
        facilityId,
      },
      include: {
        membershipPlan: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      facility,
      planAccesses,
    });
  } catch (error) {
    console.error("Get facility plan access error:", error);

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