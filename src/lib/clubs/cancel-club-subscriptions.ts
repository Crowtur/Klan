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
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

/** Procesa las suscripciones del club suspendido y conserva el resultado individual de los intentos de cancelación. */
export async function cancelClubSubscriptions(clubId: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, status: true },
  });

  if (!club || club.status !== "SUSPENDED") {
    throw new Error("CLUB_NOT_SUSPENDED");
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      clubMembership: { clubId },
      stripeSubscriptionId: { not: null },
    },
    select: {
      id: true,
      stripeSubscriptionId: true,
    },
  });

  let cancelled = 0;
  const errors: Array<{
    subscriptionId: string;
    message: string;
  }> = [];

  for (const subscription of subscriptions) {
    try {
      if (subscription.stripeSubscriptionId) {
        try {
          // Cancelación inmediata: no esperar al próximo ciclo.
          await stripe.subscriptions.cancel(
            subscription.stripeSubscriptionId,
            { prorate: false }
          );
        } catch (error) {
          // Si ya estaba cancelada, consultar el estado real.
          if (
            error instanceof Stripe.errors.StripeError &&
            error.statusCode === 404
          ) {
            throw new Error(
              "La suscripción no se encontró en Stripe; requiere revisión"
            );
          }

          const current = await stripe.subscriptions.retrieve(
            subscription.stripeSubscriptionId
          );

          if (current.status !== "canceled") {
            throw error;
          }
        }
      }

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "CANCELLED",
          gracePeriodEndsAt: null,
        },
      });

      cancelled++;
    } catch (error) {
      errors.push({
        subscriptionId: subscription.id,
        message:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      });
    }
  }

  return {
    success: errors.length === 0,
    total: subscriptions.length,
    cancelled,
    errors,
  };
}
