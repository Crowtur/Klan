import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { Prisma, DurationUnit } from "@prisma/client";
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

async function isClubSuspensionBlocked(db:Prisma.TransactionClient,clubId: string): Promise<boolean> {
  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { status: true },
  });

  // También bloqueamos clubes inexistentes por seguridad.
  return !club || club.status !== "ACTIVE";
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
    return await prisma.$transaction(async db => {
      await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${event.id},0))::text`;
      const existing=await db.stripeWebhookEvent.findUnique({where:{id:event.id}});
      if(existing?.status==="PROCESSED") return NextResponse.json({success:true,duplicate:true});
      const run=<T,>(work:(tx:Prisma.TransactionClient)=>Promise<T>)=>work(db);
      const handle=async()=>{
    switch (event.type) {
      /**
       * =========================================================
       * 1. CHECKOUT COMPLETADO (Pago Inicial)
       * =========================================================
       */
      case "checkout.session.async_payment_succeeded":
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

        const payment = await db.payment.findUnique({
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

        if (payment.subscriptionId !== subscriptionId || session.currency !== "usd" || session.amount_total !== Math.round(Number(payment.amount)*100)) throw new Error("Checkout inconsistente");
        if (payment.subscription.billingMode === "ONE_TIME") {
          if (session.mode !== "payment" || payment.stripeCheckoutSessionId !== session.id) throw new Error("Sesión del pase inválida");
          const paidAt = new Date(event.created * 1000);
          const days = payment.subscription.durationValueSnapshot ?? payment.subscription.plan.durationValue;
          const expiresAt = new Date(+paidAt + days * 86400000);
          await run(async tx => {
            const claimed = await tx.payment.updateMany({where:{id:payment.id,status:{in:["PENDING","PROCESSING"]}},data:{status:"PAID",paidAt,stripePaymentIntentId:extractId(session.payment_intent)}});
            if (!claimed.count) return;
            if (payment.obligationId) await tx.paymentObligation.update({where:{id:payment.obligationId},data:{status:"PAID",paidAt}});
            const activated = await tx.subscription.updateMany({where:{id:subscriptionId,status:"PENDING_PAYMENT",firstActivatedAt:null,clubMembership:{status:{not:"REMOVED"},club:{status:"ACTIVE"}}},data:{status:"ACTIVE",startedAt:paidAt,firstActivatedAt:paidAt,expiresAt}});
            if (activated.count) await tx.membershipEvent.create({data:{clubMembershipId:payment.subscription.clubMembershipId,type:"REACTIVATED",previousStatus:payment.subscription.clubMembership.status,newStatus:"ACTIVE",newRole:payment.subscription.clubMembership.role,eventKey:"activation:"+subscriptionId}});
            if (activated.count) await tx.clubMembership.update({where:{id:payment.subscription.clubMembershipId},data:{status:"ACTIVE",finishedAt:null}});
          });
          break;
        }
        if (payment.status === "PAID" && payment.stripePaymentIntentId) {
          return NextResponse.json({
            success: true,
            message: "El pago ya había sido procesado completamente",
          });
        }

        const clubBlocked = await isClubSuspensionBlocked(db,
          payment.subscription.clubMembership.clubId
        );

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

        await run(async (tx) => {
          await tx.payment.update({
            where: {
              id: payment.id,
            },
            data: {
              status: "PAID",
              paidAt: now,
              ...(payment.obligationId && {obligation:{update:{status:"PAID",paidAt:now}}}),
              stripePaymentIntentId: paymentIntentId,
              stripeSubscriptionId,
              ...(stripeInvoiceId ? { stripeInvoiceId } : {}),
            },
          });

          if (!clubBlocked && payment.subscription.clubMembership.status!=="REMOVED" && !["CANCELLED","FINISHED"].includes(payment.subscription.status)) {
            await tx.membershipEvent.createMany({data:[{clubMembershipId:payment.subscription.clubMembershipId,type:"REACTIVATED",previousStatus:payment.subscription.clubMembership.status,newStatus:"ACTIVE",newRole:payment.subscription.clubMembership.role,eventKey:"activation:"+subscriptionId}],skipDuplicates:true});
            await tx.subscription.update({
              where: {
                id: payment.subscriptionId,
              },
              data: {
                status: "ACTIVE",
                startedAt, firstActivatedAt: payment.subscription.firstActivatedAt ?? startedAt, nextBillingAt: expiresAt,
                expiresAt,
                stripeSubscriptionId,
                gracePeriodEndsAt: null,
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
          } else {
            // Conservar el identificador para permitir
            // su cancelación durante la suspensión.
            await tx.subscription.update({
              where: {
                id: payment.subscriptionId,
              },
              data: {
                stripeSubscriptionId,
              },
            });

            console.warn(
              `Pago inicial registrado, pero membresía no activada: club ${payment.subscription.clubMembership.clubId} bloqueado`
            );
          }
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
          console.log("Invoice pagada sin Stripe Subscription asociada");
          break;
        }

        const subscription = await db.subscription.findUnique({
          where: { stripeSubscriptionId },
          include: {
            plan: true,
            clubMembership: true,
          },
        });

        if (!subscription) {
          throw new Error("Suscripción aún no vinculada: reintentar evento");
        }

        const paymentIntentId = extractId(invoice.payment_intent);
        const now = new Date();

        const stripeSubscription = (await stripe.subscriptions.retrieve(
          stripeSubscriptionId
        )) as unknown as StripeSubscriptionPayload;

        const startedAt = safeStripeDate(
          stripeSubscription.current_period_start ??
            stripeSubscription.start_date,
          now
        );

        const expiresAt = resolveExpirationDate(
          stripeSubscription.current_period_end,
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

        // Buscar primero por factura y después por PaymentIntent.
        let existingPayment = await db.payment.findFirst({
          where: { stripeInvoiceId: invoice.id },
        });

        if (!existingPayment && paymentIntentId) {
          existingPayment = await db.payment.findUnique({
            where: { stripePaymentIntentId: paymentIntentId },
          });
        }

        const gracePeriodStillValid =
          subscription.gracePeriodEndsAt !== null &&
          subscription.gracePeriodEndsAt > now;

        const graceAlreadyExpired =
          subscription.status === "EXPIRED" ||
          subscription.status === "CANCELLED" ||
          (
            subscription.gracePeriodEndsAt !== null &&
            subscription.gracePeriodEndsAt <= now
          );

        const clubBlocked = await isClubSuspensionBlocked(db,
          subscription.clubMembership.clubId
        );

        const canReactivateMembership =
          !clubBlocked &&
          !graceAlreadyExpired &&
          (
            subscription.clubMembership.status === "ACTIVE" ||
            (
              subscription.status === "PENDING_PAYMENT" &&
              gracePeriodStillValid
            )
          );

        await run(async (tx) => {
          const obligationKey=existingPayment?.obligationId ? undefined : "invoice:"+invoice.id;
          const obligation=await tx.paymentObligation.upsert({where:existingPayment?.obligationId?{id:existingPayment.obligationId}:{obligationKey},update:{status:"PAID",stripeInvoiceId:invoice.id,paidAt:now},create:{obligationKey:obligationKey!,subscriptionId:subscription.id,userId:subscription.clubMembership.userId,clubId:subscription.clubMembership.clubId,amount,currency,stripeInvoiceId:invoice.id,status:"PAID",paidAt:now}});
          if (existingPayment) {
            // Recuperar el registro existente, incluso si estaba FAILED.
            await tx.payment.update({
              where: { id: existingPayment.id },
              data: {
                status: "PAID",
                paidAt: now,
                amount,
                currency,
                stripeSubscriptionId,
                stripeInvoiceId: invoice.id, obligationId:obligation.id,
                ...(paymentIntentId
                  ? { stripePaymentIntentId: paymentIntentId }
                  : {}),
              },
            });
          } else {
            // Crear el registro solo cuando todavía no existe.
            await tx.payment.create({
              data: {
                clubId: subscription.clubMembership.clubId,
                userId: subscription.clubMembership.userId,
                subscriptionId: subscription.id,
                amount,
                currency,
                status: "PAID",
                paidAt: now,
                stripeSubscriptionId,
                stripeInvoiceId: invoice.id, obligationId:obligation.id,
                stripePaymentIntentId: paymentIntentId,
              },
            });
          }

          // Solo reactivar la suscripción si la gracia no ha vencido previamente y el club no está bloqueado.
          if (
            !clubBlocked &&
            !graceAlreadyExpired &&
            subscription.status !== "SUSPENDED"
          ) {
            await tx.subscription.updateMany({
              where: {
                id: subscription.id,
                status: {
                  notIn: ["EXPIRED", "CANCELLED"],
                },
                OR: [
                  { gracePeriodEndsAt: null },
                  { gracePeriodEndsAt: { gt: now } },
                ],
              },
              data: {
                status: "ACTIVE", nextBillingAt:expiresAt,
                expiresAt,
                gracePeriodEndsAt: null,
              },
            });
          }

          // Solo recuperar la membresía si no perdió ya el acceso por haber terminado su periodo de gracia.
          if (canReactivateMembership && !graceAlreadyExpired) {
            await tx.clubMembership.update({
              where: { id: subscription.clubMembershipId },
              data: { status: "ACTIVE" },
            });
          }
        });

        console.log(
          `Factura ${invoice.id} procesada como PAID para Subscription ${subscription.id}`
        );

        break;
      }

      /**
       * =========================================================
       * 3. RENOVACIÓN FALLIDA (Periodo de gracia)
       * =========================================================
       */
      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as StripeInvoicePayload;

        const stripeSubscriptionId =
          extractSubscriptionIdFromInvoice(invoice);

        if (!stripeSubscriptionId) {
          console.log(
            "Invoice fallida sin Stripe Subscription asociada"
          );
          break;
        }

        const subscription = await db.subscription.findUnique({
          where: { stripeSubscriptionId },
          include: {
            clubMembership: true,
          },
        });

        if (!subscription) {
          throw new Error("Suscripción aún no vinculada: reintentar evento");
        }

        const clubBlocked = await isClubSuspensionBlocked(db,
          subscription.clubMembership.clubId
        );

        if (
          clubBlocked ||
          subscription.status === "SUSPENDED" ||
          subscription.status === "CANCELLED"
        ) {
          console.log(
            `Se ignora el cambio de estado por pago fallido de la suscripción ${subscription.id}`
          );
          break;
        }

        // Protección adicional: la gracia aplica exclusivamente a renovaciones
        // de suscripciones que ya hayan iniciado (startedAt existe).
        if (!subscription.startedAt) {
          console.log(
            `Subscription ${subscription.id} todavía no ha comenzado. ` +
            "El fallo inicial no inicia el periodo de gracia."
          );
          break;
        }

        const paymentIntentId = extractId(invoice.payment_intent);

        const amount =
          typeof invoice.amount_due === "number"
            ? invoice.amount_due / 100
            : 0;

        const currency = invoice.currency || "usd";

        const now = new Date();

        let existingPayment = await db.payment.findFirst({
          where: { stripeInvoiceId: invoice.id },
        });

        if (!existingPayment && paymentIntentId) {
          existingPayment = await db.payment.findUnique({
            where: {
              stripePaymentIntentId: paymentIntentId,
            },
          });
        }

        // Evita que un evento de fallo retrasado revierta
        // un pago que ya fue confirmed.
        if (existingPayment?.status === "PAID") {
          console.log(
            `Invoice ${invoice.id} ya fue pagada. Se ignora el fallo.`
          );
          break;
        }

        // Comprobar directamente en Stripe si la factura ya está pagada.
        try {
          const currentInvoice = await stripe.invoices.retrieve(invoice.id);
          if (currentInvoice.status === "paid") {
            console.log(
              `Invoice ${invoice.id} ya está pagada. Se ignora el fallo retrasado.`
            );
            break;
          }
        } catch (error) {
          console.error(
            `Error al consultar Invoice ${invoice.id} en Stripe:`,
            error
          );

          throw error;
        }

        // No reabrir suscripciones que ya terminaron.
        if (subscription.status === "EXPIRED") {
          console.log(
            `Subscription ${subscription.id} ya terminó. Se ignora el fallo.`
          );
          break;
        }

        const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

        const failureDate = new Date(event.created * 1000);

        // Si ya está en periodo de gracia, conservar la fecha
        // original para que los reintentos no la extiendan.
        const gracePeriodEndsAt =
          subscription.gracePeriodEndsAt ??
          new Date(
            failureDate.getTime() + SEVEN_DAYS_IN_MS
          );

        await run(async (tx) => {
          const obligationKey=existingPayment?.obligationId ? undefined : "invoice:"+invoice.id;
          const obligation=await tx.paymentObligation.upsert({where:existingPayment?.obligationId?{id:existingPayment.obligationId}:{obligationKey},update:{status:"OPEN",stripeInvoiceId:invoice.id,paidAt:null},create:{obligationKey:obligationKey!,subscriptionId:subscription.id,userId:subscription.clubMembership.userId,clubId:subscription.clubMembership.clubId,amount,currency,stripeInvoiceId:invoice.id,status:"OPEN",paidAt:null}});
          if (existingPayment) {
            await tx.payment.update({
              where: {
                id: existingPayment.id,
              },
              data: {
                status: "FAILED",
                stripeInvoiceId: invoice.id, obligationId:obligation.id,
                stripeSubscriptionId,
                ...(paymentIntentId
                  ? { stripePaymentIntentId: paymentIntentId }
                  : {}),
              },
            });
          } else {
            await tx.payment.create({
              data: {
                clubId: subscription.clubMembership.clubId,
                userId: subscription.clubMembership.userId,
                subscriptionId: subscription.id,

                amount,
                currency,
                status: "FAILED",

                stripePaymentIntentId: paymentIntentId,
                stripeSubscriptionId,
                stripeInvoiceId: invoice.id, obligationId:obligation.id,
              },
            });
          }

          // Iniciar o mantener el periodo de gracia.
          await tx.subscription.update({
            where: {
              id: subscription.id,
            },
            data: {
              status: "PENDING_PAYMENT",
              gracePeriodEndsAt,
            },
          });
        });

        console.log(
          `Pago fallido para Subscription ${subscription.id}. ` +
            `Periodo de gracia hasta ${gracePeriodEndsAt.toISOString()}`
        );

        break;
      }

      /**
       * =========================================================
       * 4. SUBSCRIPTION ACTUALIZADA
       * =========================================================
       */
      case "customer.subscription.updated": {
        const eventSubscription =
          event.data.object as unknown as StripeSubscriptionPayload;

        const localSubscription = await db.subscription.findUnique({
          where: {
            stripeSubscriptionId: eventSubscription.id,
          },
          include: {
            plan: true,
            clubMembership: true,
          },
        });

        if (!localSubscription) {
          console.log(
            `Subscription local no encontrada para ${eventSubscription.id}`
          );
          break;
        }

        const clubBlocked = await isClubSuspensionBlocked(db,
          localSubscription.clubMembership.clubId
        );

        if (
          clubBlocked ||
          localSubscription.status === "CANCELLED"
        ) {
          console.log(
            `Se omite la actualización de estado de la suscripción ${localSubscription.id} porque el club está bloqueado o la suscripción fue cancelada`
          );
          break;
        }

        // Consultar el estado actual en Stripe.
        // Esto evita que un webhook antiguo sobrescriba un
        // estado más reciente, como un pago ya recuperado.
        const stripeSubscription = (await stripe.subscriptions.retrieve(
          eventSubscription.id
        )) as unknown as StripeSubscriptionPayload;

        const now = new Date();

        const startedAt = safeStripeDate(
          stripeSubscription.current_period_start ??
            stripeSubscription.start_date,
          localSubscription.startedAt ?? now
        );

        const expiresAt = resolveExpirationDate(
          stripeSubscription.current_period_end,
          startedAt,
          {
            durationValue: localSubscription.plan.durationValue,
            durationUnit: localSubscription.plan.durationUnit,
          }
        );

        switch (stripeSubscription.status) {
          case "active":
          case "trialing": {
            // Si hay un fallo de pago pendiente, este webhook
            // no debe cancelar el periodo de gracia.
            // Esperamos la confirmación en invoice.payment_succeeded.
            if (localSubscription.status === "PENDING_PAYMENT") {
              console.log(
                `Subscription ${localSubscription.id} sigue esperando confirmación del pago.`
              );
              break;
            }

            // Evitar reactivar una suscripción que terminó localmente.
            if (localSubscription.status === "EXPIRED") {
              console.log(
                `Subscription ${localSubscription.id} está terminada localmente.`
              );
              break;
            }

            await db.subscription.update({
              where: { id: localSubscription.id },
              data: {
                status: "ACTIVE", nextBillingAt:expiresAt,
                expiresAt,
                gracePeriodEndsAt: null,
              },
            });

            break;
          }

          case "past_due": {
            // Protección adicional: el periodo de gracia aplica solo si la suscripción ya fue pagada e inició.
            if (!localSubscription.startedAt) {
              console.log(
                `Subscription ${localSubscription.id} sin periodo pagado inicial.`
              );
              break;
            }

            // Unificar fecha con event.created
            const failureDate = new Date(event.created * 1000);

            // No reiniciar el periodo de gracia si ya comenzó.
            const gracePeriodEndsAt =
              localSubscription.gracePeriodEndsAt ??
              new Date(failureDate.getTime() + 7 * 24 * 60 * 60 * 1000);

            // No reabrir una suscripción local ya terminada.
            if (localSubscription.status === "EXPIRED") {
              break;
            }

            await db.subscription.update({
              where: { id: localSubscription.id },
              data: {
                status: "PENDING_PAYMENT",
                gracePeriodEndsAt,
              },
            });

            console.log(
              `Subscription ${localSubscription.id} en periodo de gracia hasta ${gracePeriodEndsAt.toISOString()}`
            );

            break;
          }

          case "canceled":
          case "unpaid": {
            if (
              localSubscription.status === "PENDING_PAYMENT" &&
              localSubscription.gracePeriodEndsAt !== null
            ) {
              console.warn(
                `Subscription ${localSubscription.id}: Stripe indica ` +
                `${stripeSubscription.status}, pero la gracia local ` +
                `termina el ${localSubscription.gracePeriodEndsAt.toISOString()}.`
              );
              break;
            }

            await db.subscription.updateMany({
              where: {
                id: localSubscription.id,
                status: {
                  notIn: ["CANCELLED", "EXPIRED"],
                },
              },
              data: {
                status: "CANCELLED",
                gracePeriodEndsAt: null,
              },
            });

            break;
          }

          case "incomplete_expired": {
            await db.subscription.updateMany({
              where: {
                id: localSubscription.id,
                status: {
                  notIn: ["CANCELLED", "EXPIRED"],
                },
              },
              data: {
                status: "CANCELLED",
                gracePeriodEndsAt: null,
              },
            });

            break;
          }

          case "incomplete":
          case "paused":
          default: {
            if (
              localSubscription.status === "PENDING_PAYMENT" &&
              localSubscription.gracePeriodEndsAt !== null
            ) {
              console.warn(
                `Subscription ${localSubscription.id} está en periodo de gracia (PENDING_PAYMENT). ` +
                `Se preserva el periodo de gracia frente al estado '${stripeSubscription.status}' de Stripe.`
              );
              break;
            }

            if (localSubscription.status === "EXPIRED") {
              break;
            }

            await db.subscription.update({
              where: { id: localSubscription.id },
              data: {
                status: "SUSPENDED",
                suspendedAt: localSubscription.status === "SUSPENDED" ? localSubscription.suspendedAt : new Date(event.created * 1000),
                gracePeriodEndsAt: null,
              },
            });

            break;
          }
        }

        console.log(
          `Subscription ${localSubscription.id} sincronizada con Stripe: ${stripeSubscription.status}`
        );

        break;
      }

      /**
       * =========================================================
       * 5. SUBSCRIPTION ELIMINADA / TERMINADA
       * =========================================================
       */
      case "customer.subscription.deleted": {
        const eventSubscription =
          event.data.object as unknown as StripeSubscriptionPayload;

        const localSubscription = await db.subscription.findUnique({
          where: {
            stripeSubscriptionId: eventSubscription.id,
          },
        });

        if (!localSubscription) {
          console.log(
            `Subscription local no encontrada para ${eventSubscription.id}`
          );
          break;
        }

        // Verificar el estado actual cuando la suscripción todavía
        // existe en Stripe, para evitar procesar un evento retrasado.
        let currentStripeStatus: string = eventSubscription.status;

        try {
          const currentStripeSubscription =
            await stripe.subscriptions.retrieve(eventSubscription.id);

          currentStripeStatus = currentStripeSubscription.status;
        } catch (error) {
          // Una suscripción eliminada puede no estar disponible
          // para consulta. En ese caso usamos el evento firmado.
          if (
            error instanceof Stripe.errors.StripeError &&
            error.statusCode === 404
          ) {
            console.log(
              `Subscription ${eventSubscription.id} no disponible en Stripe; se procesa el evento de eliminación.`
            );
          } else {
            throw error;
          }
        }

        // Si Stripe todavía considera activa la suscripción,
        // no debemos cancelarla por un evento desactualizado.
        if (
          currentStripeStatus === "active" ||
          currentStripeStatus === "trialing"
        ) {
          console.log(
            `Subscription ${localSubscription.id} continúa activa en Stripe.`
          );
          break;
        }

        // Si existe un periodo de gracia pendiente,
        // no permitir que la eliminación en Stripe borre
        // la fecha que necesita nuestro cron.
        if (
          localSubscription.status === "PENDING_PAYMENT" &&
          localSubscription.gracePeriodEndsAt !== null
        ) {
          console.warn(
            `Subscription ${localSubscription.id} eliminada en Stripe, ` +
            `pero mantiene su gracia local hasta ` +
            `${localSubscription.gracePeriodEndsAt.toISOString()}.`
          );

          break;
        }

        // Cancelación efectiva sin periodo de gracia pendiente.
        await db.subscription.updateMany({
          where: {
            id: localSubscription.id,
            status: {
              notIn: ["CANCELLED", "EXPIRED"],
            },
          },
          data: {
            status: "CANCELLED",
            gracePeriodEndsAt: null,
          },
        });

        // IMPORTANTE:
        // No modificar ClubMembership.
        // La membresía y la suscripción son conceptos distintos.

        console.log(
          `Subscription ${localSubscription.id} terminada correctamente.`
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
      };
      const response=await handle();
      if(!response.ok)throw new Error("Evento pendiente de reintento");
      await db.stripeWebhookEvent.upsert({where:{id:event.id},update:{status:"PROCESSED",processedAt:new Date(),attempts:{increment:1}},create:{id:event.id,type:event.type,stripeCreatedAt:new Date(event.created*1000),status:"PROCESSED",processedAt:new Date(),attempts:1}});
      return response;
    },{timeout:30000});
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