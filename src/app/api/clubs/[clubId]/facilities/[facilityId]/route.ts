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

import { validFacilityIcon } from "@/lib/facility-icons";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

/** Obtiene los detalles de una instalación perteneciente al club indicado. */
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

    return NextResponse.json({
      success: true,
      facility,
    });
  } catch (error) {
    console.error("Get facility detail error:", error);

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

/** Actualiza la configuración y los datos descriptivos de la instalación. */
export async function PATCH(
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
            "No tienes permisos para editar instalaciones de este club",
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

    const {
      name,
      description,
      location,
      capacity,
      status,
    } = body;
    if (body.icon !== undefined && !validFacilityIcon(body.icon)) return NextResponse.json({message:"Icono de instalación inválido"},{status:400});


    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El nombre debe ser un texto válido",
        },
        { status: 400 }
      );
    }

    if (
      capacity !== undefined &&
      capacity !== null &&
      (!Number.isInteger(capacity) || capacity <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "La capacidad debe ser un número entero mayor a 0",
        },
        { status: 400 }
      );
    }

    if (
      status !== undefined &&
      status !== "ACTIVE" &&
      status !== "INACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El estado debe ser ACTIVE o INACTIVE",
        },
        { status: 400 }
      );
    }

    const updatedFacility = await prisma.facility.update({
      where: {
        id: facilityId,
      },
      data: {
        ...(body.icon !== undefined && {icon:body.icon}),
        ...(name !== undefined && {
          name: name.trim(),
        }),
        ...(description !== undefined && {
          description:
            description === null
              ? null
              : String(description).trim(),
        }),
        ...(location !== undefined && {
          location:
            location === null
              ? null
              : String(location).trim(),
        }),
        ...(capacity !== undefined && {
          capacity,
        }),
        ...(status !== undefined && {
          status,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      facility: updatedFacility,
    });
  } catch (error) {
    console.error("Update facility error:", error);

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

/** Desactiva la instalación para impedir nuevas reservas. */
export async function DELETE(
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
            "No tienes permisos para desactivar instalaciones de este club",
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

    if (facility.status === "INACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "La instalación ya está inactiva",
        },
        { status: 400 }
      );
    }

    const updatedFacility = await prisma.facility.update({
      where: {
        id: facilityId,
      },
      data: {
        status: "INACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Instalación desactivada correctamente",
      facility: updatedFacility,
    });
  } catch (error) {
    console.error("Deactivate facility error:", error);

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