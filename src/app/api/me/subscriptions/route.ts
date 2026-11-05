
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

        cancelAtPeriodEnd:true, billingMode:true, firstActivatedAt:true, finishedAt:true, nextBillingAt:true, priceSnapshot:true, obligations:{where:{status:"OPEN"},select:{amount:true,dueAt:true}},
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

    const rank=(status:string)=>status==="PENDING_PAYMENT"?0:status==="ACTIVE"?1:2;
    subscriptions.sort((a,b)=>rank(a.status)-rank(b.status));
    // 3. Devolver las suscripciones.
    return NextResponse.json({
      success: true,
      subscriptions: subscriptions.map(s=>({...s,nextBillingAt:s.status==="ACTIVE"&&s.billingMode==="RECURRING"&&s.plan.type==="PAID"&&!s.cancelAtPeriodEnd ? (s.nextBillingAt??s.expiresAt):null,nextBillingEstimated:!s.nextBillingAt})),
      activeCount:subscriptions.filter(s=>s.status==="ACTIVE"&&s.billingMode==="RECURRING").length,
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
