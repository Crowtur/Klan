import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

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
    const user = await requireAuth(request);

    const { clubId, subscriptionId } = await context.params;

    const subscription = await prisma.subscription.findUnique({
      where: {
        id: subscriptionId,
      },
      include: {
        plan: true,
        clubMembership: {
          include: {
            user: true,
            club: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          message: "La suscripción no existe",
        },
        { status: 404 }
      );
    }

    if (subscription.clubMembership.clubId !== clubId) {
      return NextResponse.json(
        {
          success: false,
          message: "La suscripción no pertenece a este club",
        },
        { status: 403 }
      );
    }

    if (subscription.clubMembership.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "No tienes permisos para pagar esta suscripción",
        },
        { status: 403 }
      );
    }

    if (subscription.plan.type !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: "Esta suscripción no requiere pago",
        },
        { status: 400 }
      );
    }

    if (subscription.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        {
          success: false,
          message: "La suscripción no está pendiente de pago",
        },
        { status: 400 }
      );
    }

    if (!subscription.plan.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "El plan de membresía no está activo",
        },
        { status: 400 }
      );
    }

    /*
     * Si el plan requiere documentación,
     * debe existir una solicitud aprobada.
     *
     * Esto solamente se verifica para la adquisición inicial.
     * Las renovaciones futuras serán gestionadas por Stripe.
     */
    if (subscription.plan.requiresDocumentation) {
      const application =
        await prisma.membershipApplication.findFirst({
          where: {
            userId: user.id,
            planId: subscription.planId,
            status: "APPROVED",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      if (!application) {
        return NextResponse.json(
          {
            success: false,
            message:
              "La documentación requerida debe ser aprobada antes de realizar el pago",
          },
          { status: 400 }
        );
      }
    }

    /*
     * Si ya existe una suscripción de Stripe asociada,
     * no debemos crear otra.
     */
    if (subscription.stripeSubscriptionId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Esta membresía ya tiene una suscripción de Stripe asociada",
        },
        { status: 400 }
      );
    }

    /*
     * Buscar un Payment pendiente existente.
     * Esto evita crear múltiples Payments locales
     * si el usuario vuelve a solicitar el Checkout.
     */
    const existingPayment = await prisma.payment.findFirst({
      where: {
        subscriptionId: subscription.id,
        status: {
          in: ["PENDING", "PROCESSING"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingPayment?.stripeCheckoutSessionId) {
      const existingSession =
        await stripe.checkout.sessions.retrieve(
          existingPayment.stripeCheckoutSessionId
        );

      if (existingSession.status === "open") {
        return NextResponse.json({
          success: true,
          message: "Ya existe una sesión de pago activa",
          checkoutUrl: existingSession.url,
          paymentId: existingPayment.id,
        });
      }
    }

    const amount = Number(subscription.plan.price);

    if (amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "El precio del plan debe ser mayor que cero",
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL no está configurada");
    }

    /*
     * Crear el Payment local antes de contactar con Stripe.
     */
    const payment = await prisma.payment.create({
      data: {
        clubId,
        userId: user.id,
        subscriptionId: subscription.id,
        amount: subscription.plan.price,
        currency: "usd",
        status: "PENDING",
      },
    });

    try {
      /*
       * Convertimos la duración del plan a un intervalo
       * compatible con Stripe.
       *
       * MONTH -> month
       * YEAR  -> year
       */
      const interval =
        subscription.plan.durationUnit === "MONTH"
          ? "month"
          : "year";

      const checkoutSession =
        await stripe.checkout.sessions.create({
          mode: "subscription",

          line_items: [
            {
              quantity: 1,

              price_data: {
                currency: "usd",

                unit_amount: Math.round(amount * 100),

                product_data: {
                  name: subscription.plan.name,
                  description:
                    subscription.plan.description ||
                    `Membresía de ${subscription.clubMembership.club.name}`,
                },

                recurring: {
                  interval,
                  interval_count:
                    subscription.plan.durationValue,
                },
              },
            },
          ],

          customer_email: user.email,

          /*
           * Metadata de la Checkout Session.
           */
          metadata: {
            paymentId: payment.id,
            subscriptionId: subscription.id,
            clubId,
            userId: user.id,
          },

          /*
           * Metadata que quedará asociada a la
           * suscripción de Stripe.
           *
           * Esto será importante para identificar
           * las renovaciones futuras.
           */
          subscription_data: {
            metadata: {
              subscriptionId: subscription.id,
              clubId,
              userId: user.id,
            },
          },

          success_url:
            `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${appUrl}/payment/cancelled?payment_id=${payment.id}`,
        });

      /*
       * Stripe devuelve el ID de la suscripción creada
       * cuando el Checkout está configurado en modo subscription.
       */
      const stripeSubscriptionId =
        typeof checkoutSession.subscription === "string"
          ? checkoutSession.subscription
          : null;

      /*
       * Guardamos la información de Stripe en nuestras
       * dos entidades relacionadas.
       */
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            stripeCheckoutSessionId: checkoutSession.id,
            stripeSubscriptionId,
          },
        });

        await tx.subscription.update({
          where: {
            id: subscription.id,
          },
          data: {
            stripeSubscriptionId,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message:
          "Checkout de suscripción creado correctamente",

        paymentId: payment.id,

        subscriptionId: subscription.id,

        stripeSubscriptionId,

        checkoutSessionId: checkoutSession.id,

        checkoutUrl: checkoutSession.url,
      });
    } catch (stripeError) {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "FAILED",
        },
      });

      throw stripeError;
    }
  } catch (error) {
    console.error(
      "Create recurring checkout session error:",
      error
    );

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

      if (
        error.message ===
        "NEXT_PUBLIC_APP_URL no está configurada"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Configuración de aplicación incompleta",
          },
          { status: 500 }
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