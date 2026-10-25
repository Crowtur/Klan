
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

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
