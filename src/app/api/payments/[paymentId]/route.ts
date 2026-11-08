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

/** Devuelve el detalle de un pago al titular o a un superadministrador. */
export async function GET(
  request: Request,
  context: {
    params: Promise<{
      paymentId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);

    const { paymentId } = await context.params;

    const payment = await prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        club: true,
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          message: "El pago no existe",
        },
        { status: 404 }
      );
    }

    if (payment.userId !== user.id && user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "No tienes permisos para consultar este pago",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        clubId: payment.clubId,
        clubName: payment.club.name,
        userId: payment.userId,
        subscriptionId: payment.subscriptionId,

        plan: {
          id: payment.subscription.plan.id,
          name: payment.subscription.plan.name,
          type: payment.subscription.plan.type,
          price: payment.subscription.plan.price,
          durationValue: payment.subscription.plan.durationValue,
          durationUnit: payment.subscription.plan.durationUnit,
        },

        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,

        stripeCheckoutSessionId:
          payment.stripeCheckoutSessionId,

        stripePaymentIntentId:
          payment.stripePaymentIntentId,

        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get payment error:", error);

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