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
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireSuperAdmin } from "@/lib/auth/authorization";

/** Permite al superadministrador reactivar la entidad y evaluar el acceso de sus miembros. */
export async function POST(
  request: Request,
  context: {
    params: Promise<{ entityId: string }>;
  }
) {
  try {
    const user = await requireAuth(request);
    const { entityId } = await context.params;

    // Solo el SUPER_ADMIN puede reactivar entidades.
    await requireSuperAdmin(user.id);

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!entity) {
      return NextResponse.json(
        {
          success: false,
          message: "Entidad no encontrada",
        },
        { status: 404 }
      );
    }

    if (entity.status !== "SUSPENDED") {
      return NextResponse.json(
        {
          success: false,
          message: "Solo se pueden reactivar entidades suspendidas",
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const result = await tx.entity.updateMany({
        where: {
          id: entityId,
          status: "SUSPENDED",
        },
        data: {
          status: "ACTIVE",
        },
      });

      if (result.count === 0) {
        throw new Error("ENTITY_STATUS_CHANGED");
      }

      // Recuperar acceso administrativo a la entidad.
      await tx.entityMembership.updateMany({
        where: {
          entityId,
          role: "ENTITY_ADMIN",
          status: "SUSPENDED",
        },
        data: {
          status: "ACTIVE",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Entidad reactivada correctamente",
      entityId,
      status: "ACTIVE",
    });
  } catch (error) {
    console.error("Reactivate entidad error:", error);

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
            message: "Solo el SUPER_ADMIN puede reactivar entidades",
          },
          { status: 403 }
        );
      }

      if (error.message === "ENTITY_STATUS_CHANGED") {
        return NextResponse.json(
          {
            success: false,
            message: "El estado de la entidad cambió antes de procesar la solicitud",
          },
          { status: 409 }
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