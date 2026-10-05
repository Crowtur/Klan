import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { DurationUnit } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Extensiones de tipo para compatibilidad estricta con los payloads de Webhook de Stripe.
 */
type StripeInvoicePayload = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  subscription_details?: {
    subscription?: string | Stripe.Subscription | null;
  } | null;
  parent?: {
    subscription_details?: {
      subscription?: string | Stripe.Subscription | null;
    } | null;
  } | null;
  payment_intent?: string | Stripe.PaymentIntent | null;
};

type StripeSubscriptionPayload = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
  start_date?: number;
  latest_invoice?: string | StripeInvoicePayload | null;
};

/**
 * Extrae el ID en texto plano sin importar si Stripe devuelve un string o un objeto expandido.
 */
function extractId(
  val: string | { id: string } | null | undefined
): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (
    typeof val === "object" &&
    val !== null &&
    "id" in val &&
    typeof val.id === "string"
  ) {
    return val.id;
  }
  return null;
}

/**
 * Extrae el ID de la suscripción de una factura buscando en la raíz o en los objetos anidados
 * que Stripe utiliza en versiones recientes de la API o facturas creadas por CLI.
 */
function extractSubscriptionIdFromInvoice(
  invoice: StripeInvoicePayload
): string | null {
  const directSubId = extractId(invoice.subscription);
  if (directSubId) return directSubId;

  const subDetailsId = extractId(invoice.subscription_details?.subscription);
  if (subDetailsId) return subDetailsId;

  const parentSubDetailsId = extractId(
    invoice.parent?.subscription_details?.subscription
  );
  if (parentSubDetailsId) return parentSubDetailsId;

  return null;
}

/**
 * Convierte timestamps de Stripe a objetos Date de forma segura.
 */
function safeStripeDate(
  timestamp: number | null | undefined,
  fallbackDate: Date
): Date {
  if (!timestamp || typeof timestamp !== "number") {
    return fallbackDate;
  }
  const date = new Date(timestamp * 1000);
  return isNaN(date.getTime()) ? fallbackDate : date;
}

/**
 * Calcula la fecha de expiración sumando meses o años exactos según el calendario.
 */
function calculateExpirationFromPlan(
  startDate: Date,
  durationValue: number,
  durationUnit: DurationUnit
): Date {
  const expiresAt = new Date(startDate);

  if (durationUnit === "YEAR") {
    expiresAt.setFullYear(expiresAt.getFullYear() + durationValue);
  } else if (durationUnit === "MONTH") {
    expiresAt.setMonth(expiresAt.getMonth() + durationValue);
  }

  return expiresAt;
}

/**
 * Determina la fecha de expiración priorizando el cálculo exacto de Stripe
 * y usando las propiedades del MembershipPlan como fallback dinámico.
 */
function resolveExpirationDate(
  stripePeriodEndTimestamp: number | null | undefined,
  startDate: Date,
  plan: { durationValue: number; durationUnit: DurationUnit }
): Date {
  if (stripePeriodEndTimestamp && typeof stripePeriodEndTimestamp === "number") {
    const stripeDate = new Date(stripePeriodEndTimestamp * 1000);
    if (!isNaN(stripeDate.getTime())) {
      return stripeDate;
    }
  }

  return calculateExpirationFromPlan(
    startDate,
    plan.durationValue,
    plan.durationUnit
  );
}

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

        if (payment.status === "PAID" && payment.stripePaymentIntentId) {
          return NextResponse.json({
            success: true,
            message: "El pago ya había sido procesado completamente",
          });
        }

        const stripeSubscriptionId = extractId(session.subscription);
        const stripeInvoiceId = extractId(session.invoice);
        let paymentIntentId = extractId(session.payment_intent);

        if (!paymentIntentId && session.id) {
          try {
            const sessionExpanded = await stripe.checkout.sessions.retrieve(
              session.id,
              {
                expand: [
                  "invoice.payment_intent",
                  "subscription.latest_invoice.payment_intent",
                ],
              }
            );

            const inv = sessionExpanded.invoice as unknown as StripeInvoicePayload;
            if (inv) {
              paymentIntentId = extractId(inv.payment_intent);
            }

            if (!paymentIntentId && sessionExpanded.subscription) {
              const sub = sessionExpanded.subscription as unknown as StripeSubscriptionPayload;
              if (sub.latest_invoice) {
                const latestInv = sub.latest_invoice as unknown as StripeInvoicePayload;
                paymentIntentId = extractId(latestInv.payment_intent);
              }
            }
          } catch (error) {
            console.error(
              "Error al recuperar PaymentIntent expandido desde Stripe:",
              error
            );
          }
        }

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
        )) as unknown as StripeSubscriptionPayload;

        const now = new Date();
        const plan = payment.subscription.plan;

        const startedAt = safeStripeDate(
          stripeSubscription?.current_period_start ??
            stripeSubscription?.start_date,
          now
        );

        const expiresAt = resolveExpirationDate(
          stripeSubscription?.current_period_end,
          startedAt,
          {
            durationValue: plan.durationValue,
            durationUnit: plan.durationUnit,
          }
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
          `Pago inicial ${payment.id} procesado correctamente. PaymentIntent: ${paymentIntentId}`
        );

        break;
      }

      /**
       * =========================================================
       * 2. RENOVACIÓN PAGADA
       * =========================================================
       */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as unknown as StripeInvoicePayload;

        const stripeSubscriptionId = extractSubscriptionIdFromInvoice(invoice);

        if (!stripeSubscriptionId) {
          console.log(
            "Invoice pagada sin Stripe Subscription asociada"
          );

          break;
        }

        const paymentIntentId = extractId(invoice.payment_intent);

        /**
         * Idempotencia Barrera 1: Comprobación por stripeInvoiceId
         */
        const existingInvoicePayment = await prisma.payment.findFirst({
          where: {
            stripeInvoiceId: invoice.id,
          },
        });

        if (existingInvoicePayment) {
          if (
            !existingInvoicePayment.stripePaymentIntentId &&
            paymentIntentId
          ) {
            await prisma.payment.update({
              where: { id: existingInvoicePayment.id },
              data: { stripePaymentIntentId: paymentIntentId },
            });
            console.log(
              `PaymentIntent ${paymentIntentId} actualizado en Payment ${existingInvoicePayment.id}`
            );
          } else {
            console.log(
              `Payment ${existingInvoicePayment.id} ya existe para esta Invoice`
            );
          }

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

        const stripeSubscription = (await stripe.subscriptions.retrieve(
          stripeSubscriptionId
        )) as unknown as StripeSubscriptionPayload;

        const now = new Date();

        const startedAt = safeStripeDate(
          stripeSubscription?.current_period_start,
          now
        );

        const expiresAt = resolveExpirationDate(
          stripeSubscription?.current_period_end,
          startedAt,
          {
            durationValue: subscription.plan.durationValue,
            durationUnit: subscription.plan.durationUnit,
          }
        );

        const amount =
          typeof invoice.amount_paid === "number"
            ? invoice.amount_paid / 100
            : 0;

        const currency = invoice.currency || "usd";

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
        const invoice = event.data.object as unknown as StripeInvoicePayload;

        const stripeSubscriptionId = extractSubscriptionIdFromInvoice(invoice);

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

        const paymentIntentId = extractId(invoice.payment_intent);

        const amount =
          typeof invoice.amount_due === "number"
            ? invoice.amount_due / 100
            : 0;

        const currency = invoice.currency || "usd";

        let existingPayment = await prisma.payment.findFirst({
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
        const stripeSubscription =
          event.data.object as unknown as StripeSubscriptionPayload;

        const localSubscription =
          await prisma.subscription.findUnique({
            where: {
              stripeSubscriptionId: stripeSubscription.id,
            },
            include: {
              plan: true,
              clubMembership: true,
            },
          });

        if (!localSubscription) {
          console.log(
            `Subscription local no encontrada para ${stripeSubscription.id}`
          );

          break;
        }

        const now = new Date();

        const startedAt = safeStripeDate(
          stripeSubscription?.current_period_start,
          now
        );

        const expiresAt = resolveExpirationDate(
          stripeSubscription?.current_period_end,
          startedAt,
          {
            durationValue: localSubscription.plan.durationValue,
            durationUnit: localSubscription.plan.durationUnit,
          }
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
        const stripeSubscription =
          event.data.object as unknown as StripeSubscriptionPayload;

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