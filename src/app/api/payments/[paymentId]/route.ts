import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

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