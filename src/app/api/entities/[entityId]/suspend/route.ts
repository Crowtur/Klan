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
import { requireEntitySuspensionPermission } from "@/lib/auth/authorization";
import { cancelEntitySubscriptions } from "@/lib/entities/cancel-entity-subscriptions";

/** Suspende el acceso de la entidad y coordina la cancelación de renovaciones con Stripe. */
export async function POST(
  request: Request,
  context: {
    params: Promise<{ entityId: string }>;
  }
) {
  try {
    const user = await requireAuth(request);
    const { entityId } = await context.params;

    await requireEntitySuspensionPermission(user.id, entityId);

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true, status: true },
    });

    if (!entity) {
      return NextResponse.json(
        { success: false, message: "Entidad no encontrada" },
        { status: 404 }
      );
    }

    // Suspender la entidad y sus miembros en una sola transacción.
    // No depende de que Stripe responda correctamente.
    await prisma.$transaction(async (tx) => {
      await tx.entityMembership.updateMany({
        where: {
          entityId,
          status: "ACTIVE",
        },
        data: {
          status: "SUSPENDED",
        },
      });

      await tx.entity.update({
        where: { id: entityId },
        data: {
          status: "SUSPENDED",
        },
      });
    });

    // Intentar cancelar las suscripciones recurrentes.
    // Si falla Stripe, la entidad permanece suspendida.
    let stripeCancellationComplete = false;
    let cancelledSubscriptions = 0;
    let cancellationErrors: Array<{
      subscriptionId: string;
      message: string;
    }> = [];

    try {
      const result = await cancelEntitySubscriptions(entityId);

      stripeCancellationComplete = result.success;
      cancelledSubscriptions = result.cancelled;
      cancellationErrors = result.errors;
    } catch (error) {
      console.error("Error de cancelación en Stripe:", error);

      cancellationErrors = [
        {
          subscriptionId: "GENERAL",
          message:
            error instanceof Error
              ? error.message
              : "Error desconocido al cancelar suscripciones",
        },
      ];
    }

    return NextResponse.json({
      success: true,
      message: stripeCancellationComplete
        ? "Entidad y membresías suspendidas correctamente"
        : "Entidad y membresías suspendidas. Algunas cancelaciones de Stripe requieren revisión o reintento.",
      entityId,
      status: "SUSPENDED",
      stripeCancellationComplete,
      cancelledSubscriptions,
      cancellationErrors,
    });
  } catch (error) {
    console.error("Suspend entidad error:", error);

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { success: false, message: "No autenticado" },
          { status: 401 }
        );
      }

      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { success: false, message: "No tienes permisos" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
