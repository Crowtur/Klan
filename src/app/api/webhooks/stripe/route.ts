import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        success: false,
        message: "Firma de Stripe no encontrada",
      },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET no está configurada");

    return NextResponse.json(
      {
        success: false,
        message: "Configuración del webhook incompleta",
      },
      { status: 500 }
    );
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Stripe webhook signature error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Firma de webhook inválida",
      },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      /**
       * =========================================================
       * 1. CHECKOUT COMPLETADO (Pago Inicial)
       * =========================================================
       */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const paymentId = session.metadata?.paymentId;
        const subscriptionId = session.metadata?.subscriptionId;

        if (!paymentId || !subscriptionId) {
          console.error(
            "Checkout Session sin paymentId o subscriptionId en metadata"
          );

          return NextResponse.json({
            success: true,
            message: "Evento recibido sin metadata suficiente",
          });
        }

        if (session.payment_status !== "paid") {
          console.log(
            `Checkout completado pero pago no confirmado: ${paymentId}`
          );

          return NextResponse.json({
            success: true,
            message: "Checkout recibido, pago aún no confirmado",
          });
        }

        const payment = await prisma.payment.findUnique({
          where: {
            id: paymentId,
          },
          include: {
            subscription: {
              include: {
                plan: true,
                clubMembership: true,
              },
            },
          },
        });

        if (!payment) {
          console.error(`Payment ${paymentId} no encontrado`);

          return NextResponse.json(
            {
              success: false,
              message: "Payment no encontrado",
            },
            { status: 404 }
          );
        }

        if (payment.status === "PAID") {
          return NextResponse.json({
            success: true,
            message: "El pago ya había sido procesado",
          });
        }

        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : null;

        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null;

        const stripeInvoiceId =
          typeof session.invoice === "string"
            ? session.invoice
            : null;

        if (!stripeSubscriptionId) {
          console.error(
            `Payment ${paymentId} no tiene Stripe Subscription asociada`
          );

          return NextResponse.json(
            {
              success: false,
              message: "Stripe Subscription no encontrada",
            },
            { status: 500 }
          );
        }

        const stripeSubscription = (await stripe.subscriptions.retrieve(
          stripeSubscriptionId
        )) as any;

        const now = new Date();

        const expiresAt = new Date(
          stripeSubscription.current_period_end * 1000
        );

        const startedAt = new Date(
          stripeSubscription.current_period_start * 1000
        );

        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: {
              id: payment.id,
            },
            data: {
              status: "PAID",
              paidAt: now,
              stripePaymentIntentId: paymentIntentId,
              stripeSubscriptionId,
              ...(stripeInvoiceId ? { stripeInvoiceId } : {}),
            },
          });

          await tx.subscription.update({
            where: {
              id: payment.subscriptionId,
            },
            data: {
              status: "ACTIVE",
              startedAt,
              expiresAt,
              stripeSubscriptionId,
            },
          });

          await tx.clubMembership.update({
            where: {
              id: payment.subscription.clubMembershipId,
            },
            data: {
              status: "ACTIVE",
            },
          });
        });

        console.log(
          `Pago inicial ${payment.id} procesado correctamente`
        );

        break;
      }

      /**
       * =========================================================
       * 2. RENOVACIÓN PAGADA
       * =========================================================
       */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;

        const stripeSubscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : null;

        if (!stripeSubscriptionId) {
          console.log(
            "Invoice pagada sin Stripe Subscription asociada"
          );

          break;
        }

        const subscription = await prisma.subscription.findUnique({
          where: {
            stripeSubscriptionId,
          },
          include: {
            plan: true,
            clubMembership: true,
          },
        });

        if (!subscription) {
          console.error(
            `Subscription local no encontrada para Stripe Subscription ${stripeSubscriptionId}`
          );

          break;
        }

        const paymentIntentId =
          typeof invoice.payment_intent === "string"
            ? invoice.payment_intent
            : null;

        /**
         * Idempotencia Barrera 1: Comprobación por stripeInvoiceId
         */
        const existingInvoicePayment = await prisma.payment.findUnique({
          where: {
            stripeInvoiceId: invoice.id,
          },
        });

        if (existingInvoicePayment) {
          console.log(
            `Payment ${existingInvoicePayment.id} ya existe para esta Invoice`
          );

          break;
        }

        /**
         * Idempotencia Barrera 2: Comprobación por stripePaymentIntentId
         */
        if (paymentIntentId) {
          const existingPayment = await prisma.payment.findUnique({
            where: {
              stripePaymentIntentId: paymentIntentId,
            },
          });

          if (existingPayment) {
            console.log(
              `Payment ${existingPayment.id} ya existe para este PaymentIntent`
            );

            break;
          }
        }

        const stripeSubscription = (await stripe.subscriptions.retrieve(
          stripeSubscriptionId
        )) as any;

        const expiresAt = new Date(
          stripeSubscription.current_period_end * 1000
        );

        const amount =
          typeof invoice.amount_paid === "number"
            ? invoice.amount_paid / 100
            : 0;

        const currency = invoice.currency || "usd";

        const now = new Date();

        await prisma.$transaction(async (tx) => {
          await tx.payment.create({
            data: {
              clubId: subscription.clubMembership.clubId,
              userId: subscription.clubMembership.userId,
              subscriptionId: subscription.id,

              amount,
              currency,

              status: "PAID",
              paidAt: now,

              stripePaymentIntentId: paymentIntentId,
              stripeSubscriptionId,
              stripeInvoiceId: invoice.id,
            },
          });

          await tx.subscription.update({
            where: {
              id: subscription.id,
            },
            data: {
              status: "ACTIVE",
              expiresAt,
            },
          });

          await tx.clubMembership.update({
            where: {
              id: subscription.clubMembershipId,
            },
            data: {
              status: "ACTIVE",
            },
          });
        });

        console.log(
          `Renovación de Subscription ${subscription.id} procesada correctamente`
        );

        break;
      }

      /**
       * =========================================================
       * 3. RENOVACIÓN FALLIDA
       * =========================================================
       */
      case "invoice.payment_failed": {
        const invoice = event.data.object as any;

        const stripeSubscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : null;

        if (!stripeSubscriptionId) {
          console.log(
            "Invoice fallida sin Stripe Subscription asociada"
          );

          break;
        }

        const subscription = await prisma.subscription.findUnique({
          where: {
            stripeSubscriptionId,
          },
          include: {
            clubMembership: true,
          },
        });

        if (!subscription) {
          console.error(
            `Subscription local no encontrada para Stripe Subscription ${stripeSubscriptionId}`
          );

          break;
        }

        const paymentIntentId =
          typeof invoice.payment_intent === "string"
            ? invoice.payment_intent
            : null;

        const amount =
          typeof invoice.amount_due === "number"
            ? invoice.amount_due / 100
            : 0;

        const currency = invoice.currency || "usd";

        let existingPayment = await prisma.payment.findUnique({
          where: {
            stripeInvoiceId: invoice.id,
          },
        });

        if (!existingPayment && paymentIntentId) {
          existingPayment = await prisma.payment.findUnique({
            where: {
              stripePaymentIntentId: paymentIntentId,
            },
          });
        }

        if (existingPayment) {
          await prisma.payment.update({
            where: {
              id: existingPayment.id,
            },
            data: {
              status: "FAILED",
              stripeInvoiceId: invoice.id,
            },
          });
        } else {
          await prisma.payment.create({
            data: {
              clubId: subscription.clubMembership.clubId,
              userId: subscription.clubMembership.userId,
              subscriptionId: subscription.id,

              amount,
              currency,

              status: "FAILED",

              stripePaymentIntentId: paymentIntentId,
              stripeSubscriptionId,
              stripeInvoiceId: invoice.id,
            },
          });
        }

        console.log(
          `Pago fallido registrado para Subscription ${subscription.id}`
        );

        break;
      }

      /**
       * =========================================================
       * 4. SUBSCRIPTION ACTUALIZADA
       * =========================================================
       */
      case "customer.subscription.updated": {
        const stripeSubscription = event.data.object as any;

        const localSubscription =
          await prisma.subscription.findUnique({
            where: {
              stripeSubscriptionId: stripeSubscription.id,
            },
            include: {
              clubMembership: true,
            },
          });

        if (!localSubscription) {
          console.log(
            `Subscription local no encontrada para ${stripeSubscription.id}`
          );

          break;
        }

        const expiresAt = new Date(
          stripeSubscription.current_period_end * 1000
        );

        let localStatus:
          | "ACTIVE"
          | "SUSPENDED"
          | "CANCELLED";

        switch (stripeSubscription.status) {
          case "active":
            localStatus = "ACTIVE";
            break;

          case "canceled":
          case "unpaid":
            localStatus = "CANCELLED";
            break;

          case "past_due":
          case "incomplete":
          case "incomplete_expired":
          default:
            localStatus = "SUSPENDED";
            break;
        }

        await prisma.subscription.update({
          where: {
            id: localSubscription.id,
          },
          data: {
            status: localStatus,
            expiresAt,
          },
        });

        console.log(
          `Subscription ${localSubscription.id} sincronizada: ${localStatus}`
        );

        break;
      }

      /**
       * =========================================================
       * 5. SUBSCRIPTION ELIMINADA / TERMINADA
       * =========================================================
       */
      case "customer.subscription.deleted": {
        const stripeSubscription = event.data.object as any;

        const localSubscription =
          await prisma.subscription.findUnique({
            where: {
              stripeSubscriptionId: stripeSubscription.id,
            },
          });

        if (!localSubscription) {
          console.log(
            `Subscription local no encontrada para ${stripeSubscription.id}`
          );

          break;
        }

        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: {
              id: localSubscription.id,
            },
            data: {
              status: "CANCELLED",
            },
          });

          await tx.clubMembership.update({
            where: {
              id: localSubscription.clubMembershipId,
            },
            data: {
              status: "SUSPENDED",
            },
          });
        });

        console.log(
          `Subscription ${localSubscription.id} terminada`
        );

        break;
      }

      /**
       * =========================================================
       * OTROS EVENTOS
       * =========================================================
       */
      default:
        console.log(
          `Evento Stripe recibido: ${event.type}`
        );
    }

    return NextResponse.json({
      success: true,
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Error procesando webhook",
      },
      { status: 500 }
    );
  }
}