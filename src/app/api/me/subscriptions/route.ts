
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // 1. Obtener el usuario autenticado.
    const user = await requireAuth(request);

    // 2. Consultar sus suscripciones.
    const subscriptions = await prisma.subscription.findMany({
      where: {
        clubMembership: {
          userId: user.id,
        },
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        status: true,

        startedAt: true,
        expiresAt: true,
        gracePeriodEndsAt: true,

        createdAt: true,
        updatedAt: true,

        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            price: true,
            durationValue: true,
            durationUnit: true,
            isActive: true,
          },
        },

        clubMembership: {
          select: {
            id: true,
            role: true,
            status: true,

            club: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    // 3. Devolver las suscripciones.
    return NextResponse.json({
      success: true,
      subscriptions,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("Get my subscriptions error:", error);

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
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
