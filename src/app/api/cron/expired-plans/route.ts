import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
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

    const expiredSubscriptions =
      await prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          expiresAt: {
            lt: now,
          },
        },
        select: {
          id: true,
          clubMembershipId: true,
          expiresAt: true,
        },
      });

    if (expiredSubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No existen suscripciones vencidas",
        checkedAt: now,
        expired: 0,
        subscriptions: [],
      });
    }

    const updatedSubscriptions = [];

    for (const subscription of expiredSubscriptions) {
      const updated =
        await prisma.subscription.update({
          where: {
            id: subscription.id,
          },
          data: {
            status: "EXPIRED",
          },
          select: {
            id: true,
            clubMembershipId: true,
            status: true,
            expiresAt: true,
          },
        });

      updatedSubscriptions.push(updated);
    }

    return NextResponse.json({
      success: true,
      message: "Suscripciones vencidas actualizadas correctamente",
      checkedAt: now,
      expired: updatedSubscriptions.length,
      subscriptions: updatedSubscriptions,
    });
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