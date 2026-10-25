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

    if (subscription.clubMembership.club.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message:
            "No se pueden iniciar pagos porque el club no está activo",
        },
        { status: 409 }
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

    // Bloquear que un intento de Checkout inicial procese renovaciones que fallaron
    if (
      subscription.startedAt !== null ||
      subscription.gracePeriodEndsAt !== null
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Esta suscripción ya inició anteriormente. " +
            "Las renovaciones pendientes se gestionan mediante Stripe.",
        },
        { status: 409 }
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

    // Exigir solicitud aprobada para todos los planes de pago
    const approvedApplication =
      await prisma.membershipApplication.findFirst({
        where: {
          userId: user.id,
          planId: subscription.planId,
          status: "APPROVED",
          plan: {
            clubId,
          },
        },
        orderBy: {
          reviewedAt: "desc",
        },
        select: {
          id: true,
        },
      });

    if (!approvedApplication) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La solicitud de membresía debe estar aprobada antes de iniciar el pago",
        },
        { status: 403 }
      );
    }

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

    const amount = Number(subscription.plan.price);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "El precio del plan debe ser mayor que cero",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(subscription.plan.durationValue) ||
      subscription.plan.durationValue <= 0 ||
      !["MONTH", "YEAR"].includes(subscription.plan.durationUnit)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "La duración del plan no es válida",
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL no está configurada");
    }

    // Buscar un Payment pendiente existente
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

    let payment = existingPayment;

    if (payment?.stripeCheckoutSessionId) {
      try {
        const existingSession =
          await stripe.checkout.sessions.retrieve(
            payment.stripeCheckoutSessionId
          );

        if (existingSession.status === "open") {
          return NextResponse.json({
            success: true,
            message: "Ya existe una sesión de pago activa",
            checkoutUrl: existingSession.url,
            paymentId: payment.id,
            checkoutSessionId: existingSession.id,
          });
        }

        if (existingSession.status === "complete") {
          return NextResponse.json(
            {
              success: false,
              message:
                "El Checkout anterior ya fue completado. " +
                "Espera la confirmación del pago.",
              checkoutSessionId: existingSession.id,
            },
            { status: 409 }
          );
        }

        // Si la sesión anterior ya expiró, marcamos el intento como FAILED
        // para permitir la creación de un intento de pago nuevo y limpio.
        if (existingSession.status === "expired") {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED" },
          });
          payment = null;
        }
      } catch (stripeErr) {
        console.error(
          "Error al consultar la Checkout Session existente:",
          stripeErr
        );

        throw stripeErr;
      }
    }

    // Si no existe un pago pendiente válido, creamos uno nuevo
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          clubId,
          userId: user.id,
          subscriptionId: subscription.id,
          amount: subscription.plan.price,
          currency: "usd",
          status: "PENDING",
        },
      });
    }

    try {
      const interval =
        subscription.plan.durationUnit === "MONTH"
          ? "month"
          : "year";

      // Clave de idempotencia única ligada al intento de pago local
      const idempotencyKey = `checkout_session_${payment.id}`;

      const checkoutSession =
        await stripe.checkout.sessions.create(
          {
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

            metadata: {
              paymentId: payment.id,
              subscriptionId: subscription.id,
              clubId,
              userId: user.id,
            },

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
          },
          {
            idempotencyKey,
          }
        );

      const stripeSubscriptionId =
        typeof checkoutSession.subscription === "string"
          ? checkoutSession.subscription
          : null;

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            stripeCheckoutSessionId: checkoutSession.id,
            ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
          },
        });

        if (stripeSubscriptionId) {
          await tx.subscription.update({
            where: {
              id: subscription.id,
            },
            data: {
              stripeSubscriptionId,
            },
          });
        }
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