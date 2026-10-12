
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { stripe } from "@/lib/stripe";

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      subscriptionId: string;
    }>;
  }
) {
  try {
    // 1. Autenticar usuario
    const user = await requireAuth(request);

    const { clubId, subscriptionId } =
      await context.params;

    // 2. Buscar suscripción y verificar propiedad
    const subscription =
      await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          clubMembership: {
            userId: user.id,
            clubId,
          },
        },
        include: {
          plan: true,
          clubMembership: true,
        },
      });

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Suscripción no encontrada",
        },
        { status: 404 }
      );
    }

    // 3. Verificar que es un plan pagado
    if (subscription.plan.type !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Esta operación solo admite suscripciones de pago",
        },
        { status: 400 }
      );
    }

    // 4. Verificar estado local
    if (subscription.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message:
            "La suscripción no está activa",
        },
        { status: 409 }
      );
    }

    // 5. Verificar referencia Stripe
    if (!subscription.stripeSubscriptionId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La suscripción no tiene referencia de Stripe",
        },
        { status: 409 }
      );
    }

    // 6. Consultar estado real en Stripe
    const stripeSubscription =
      await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

    if (stripeSubscription.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message:
            "La suscripción ya no está activa en Stripe",
        },
        { status: 409 }
      );
    }

    // 7. Cancelación previamente programada
    if (stripeSubscription.cancel_at_period_end) {
      return NextResponse.json({
        success: true,
        message:
          "La cancelación ya estaba programada",
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: true,
        cancelAt: stripeSubscription.cancel_at
          ? new Date(
              stripeSubscription.cancel_at * 1000
            ).toISOString()
          : subscription.expiresAt,
      });
    }

    // 8. Programar cancelación en Stripe
    const updatedStripeSubscription =
      await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

    // 9. NO cambiar todavía el estado local.
    // Se mantiene ACTIVE hasta finalizar
    // el período contratado.

    return NextResponse.json({
      success: true,
      message:
        "Renovación automática cancelada correctamente",
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd:
        updatedStripeSubscription.cancel_at_period_end,
      cancelAt: updatedStripeSubscription.cancel_at
        ? new Date(
            updatedStripeSubscription.cancel_at * 1000
          ).toISOString()
        : subscription.expiresAt,
    });

  } catch (error) {
    console.error(
      "Cancel subscription error:",
      error
    );

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
        message:
          "No se pudo programar la cancelación",
      },
      { status: 500 }
    );
  }
}
