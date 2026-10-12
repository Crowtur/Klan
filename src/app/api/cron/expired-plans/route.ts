import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // =====================================================
    // 1. AUTORIZACIÓN DEL CRON
    // =====================================================

    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "CRON_SECRET no está configurado",
        },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado",
        },
        { status: 401 }
      );
    }

    const now = new Date();

    // =====================================================
    // 2. SUSCRIPCIONES ACTIVAS VENCIDAS (SOLO MANUALES / SIN STRIPE)
    // =====================================================

    const expiredActiveSubscriptions =
      await prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          expiresAt: {
            lt: now,
          },
          stripeSubscriptionId: null,
        },
        select: {
          id: true,
          clubMembershipId: true,
          expiresAt: true,
        },
      });

    const expiredNormalResults = [];

    for (const subscription of expiredActiveSubscriptions) {
      // updateMany comprueba nuevamente las condiciones.
      // Evita vencer una suscripción cuyo estado cambió
      // mientras se ejecutaba el cron.
      const result = await prisma.subscription.updateMany({
        where: {
          id: subscription.id,
          status: "ACTIVE",
          expiresAt: {
            lt: now,
          },
          stripeSubscriptionId: null,
        },
        data: {
          status: "EXPIRED",
        },
      });

      if (result.count > 0) {
        expiredNormalResults.push({
          id: subscription.id,
          clubMembershipId: subscription.clubMembershipId,
          status: "EXPIRED",
          reason: "SUBSCRIPTION_EXPIRED",
        });
      }
    }

    // =====================================================
    // 3. PERIODOS DE GRACIA VENCIDOS
    // =====================================================

    const expiredGraceSubscriptions =
      await prisma.subscription.findMany({
        where: {
          status: "PENDING_PAYMENT",
          gracePeriodEndsAt: {
            lte: now,
          },
        },
        select: {
          id: true,
          clubMembershipId: true,
          stripeSubscriptionId: true,
          gracePeriodEndsAt: true,
        },
      });

    const expiredGraceResults = [];

    const failedGraceResults: {
      id: string;
      reason: string;
    }[] = [];

    for (const subscription of expiredGraceSubscriptions) {
      // =====================================================
      // A. CONSULTAR Y CANCELAR EN STRIPE
      // =====================================================

      if (subscription.stripeSubscriptionId) {
        try {
          const stripeSubscription =
            await stripe.subscriptions.retrieve(
              subscription.stripeSubscriptionId
            );

          // Comprobar si Stripe ya confirmó el pago
          // de la última factura.
          const latestInvoiceId =
            typeof stripeSubscription.latest_invoice === "string"
              ? stripeSubscription.latest_invoice
              : stripeSubscription.latest_invoice?.id;

          if (latestInvoiceId) {
            const latestInvoice =
              await stripe.invoices.retrieve(latestInvoiceId);

            if (latestInvoice.status === "paid") {
              console.warn(
                `Subscription ${subscription.id}: ` +
                "la última factura ya está pagada en Stripe. " +
                "Se requiere conciliación."
              );

              failedGraceResults.push({
                id: subscription.id,
                reason: "PAYMENT_RECONCILIATION_REQUIRED",
              });

              continue;
            }
          }

          // Una suscripción cancelada ya no necesita
          // una segunda cancelación en Stripe.
          if (
            stripeSubscription.status !== "canceled" &&
            stripeSubscription.status !== "incomplete_expired"
          ) {
            await stripe.subscriptions.cancel(
              subscription.stripeSubscriptionId,
              {
                invoice_now: false,
                prorate: false,
              }
            );

            console.log(
              `Subscription ${subscription.id} cancelada en Stripe.`
            );
          }
        } catch (error) {
          // Si Stripe no pudo confirmar o cancelar,
          // no avanzamos el vencimiento local.
          console.error(
            `Error sincronizando Subscription ${subscription.id} con Stripe:`,
            error
          );

          failedGraceResults.push({
            id: subscription.id,
            reason: "STRIPE_SYNC_FAILED",
          });

          continue;
        }
      }

      // =====================================================
      // B. ACTUALIZAR LA BASE DE DATOS
      // =====================================================

      try {
        const result = await prisma.$transaction(async (tx) => {
          // Vencer solo si continúa pendiente y la
          // fecha de gracia sigue vencida.
          const updated = await tx.subscription.updateMany({
            where: {
              id: subscription.id,
              status: "PENDING_PAYMENT",
              gracePeriodEndsAt: {
                lte: now,
              },
            },
            data: {
              status: "EXPIRED",
            },
          });

          if (updated.count === 0) {
            return null;
          }

          // Comprobar otra suscripción vigente cuyo
          // plan todavía esté habilitado.
          const anotherActiveSubscription =
            await tx.subscription.findFirst({
              where: {
                clubMembershipId: subscription.clubMembershipId,
                id: {
                  not: subscription.id,
                },
                status: "ACTIVE",
                startedAt: {
                  lte: now,
                },
                expiresAt: {
                  gt: now,
                },
                plan: {
                  isActive: true,
                },
              },
              select: {
                id: true,
              },
            });

          let membershipSuspended = false;

          if (!anotherActiveSubscription) {
            const membershipUpdate =
              await tx.clubMembership.updateMany({
                where: {
                  id: subscription.clubMembershipId,
                  status: "ACTIVE",
                },
                data: {
                  status: "SUSPENDED",
                },
              });

            membershipSuspended = membershipUpdate.count > 0;
          }

          return {
            id: subscription.id,
            clubMembershipId: subscription.clubMembershipId,
            status: "EXPIRED",
            reason: "GRACE_PERIOD_EXPIRED",
            gracePeriodEndsAt: subscription.gracePeriodEndsAt,
            membershipSuspended,
          };
        });

        if (result) {
          expiredGraceResults.push(result);
        }
      } catch (error) {
        console.error(
          `Error actualizando Subscription ${subscription.id} en PostgreSQL:`,
          error
        );

        failedGraceResults.push({
          id: subscription.id,
          reason: "DATABASE_UPDATE_FAILED",
        });
      }
    }

    // =====================================================
    // 4. RESPUESTA FINAL
    // =====================================================

    const totalExpired =
      expiredNormalResults.length + expiredGraceResults.length;

    return NextResponse.json(
      {
        success: failedGraceResults.length === 0,
        message:
          failedGraceResults.length > 0
            ? "Existen suscripciones que requieren conciliación o reintento"
            : totalExpired > 0
              ? "Procesamiento de vencimientos completado correctamente"
              : "No existen suscripciones pendientes de vencimiento",
        checkedAt: now,

        summary: {
          totalExpired,
          normalExpired: expiredNormalResults.length,
          gracePeriodExpired: expiredGraceResults.length,
          membershipsSuspended: expiredGraceResults.filter(
            (item) => item.membershipSuspended
          ).length,
          syncFailures: failedGraceResults.length,
        },

        subscriptions: {
          normalExpired: expiredNormalResults,
          gracePeriodExpired: expiredGraceResults,
          failedGraceSyncs: failedGraceResults,
        },
      },
      {
        status: failedGraceResults.length > 0 ? 500 : 200,
      }
    );
  } catch (error) {
    console.error("Cron expired plans error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}