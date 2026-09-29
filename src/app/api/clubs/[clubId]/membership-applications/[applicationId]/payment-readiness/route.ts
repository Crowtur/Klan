import { prisma } from "@/lib/prisma";

import { requireAuth } from "@/lib/auth/auth";

import { NextResponse } from "next/server";

// POST: Preparar una solicitud aprobada para el proceso de pago/activación
//
// FREE:
// - Crea ClubMembership
// - Crea Subscription ACTIVE
//
// PAID:
// - No crea Payment
// - No crea ClubMembership
// - No crea Subscription
// - Devuelve que está listo para continuar con el módulo de pagos

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      applicationId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);

    const { clubId, applicationId } = await context.params;

    // Buscar la solicitud y verificar que pertenece al usuario
    // autenticado y al club indicado
    const application = await prisma.membershipApplication.findFirst({
      where: {
        id: applicationId,
        userId: user.id,
        plan: {
          clubId,
        },
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            price: true,
            durationValue: true,
            durationUnit: true,
            requiresDocumentation: true,
            isActive: true,
            benefits: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        {
          success: false,
          message: "La solicitud no existe",
        },
        { status: 404 }
      );
    }

    // Solo una solicitud aprobada puede continuar
    if (application.status !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "La solicitud debe estar aprobada antes de iniciar el proceso de pago",
        },
        { status: 400 }
      );
    }

    // El plan debe seguir activo
    if (!application.plan.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "El plan de membresía ya no está activo",
        },
        { status: 400 }
      );
    }

    // Validar que la duración del plan sea válida
    if (
      !Number.isInteger(application.plan.durationValue) ||
      application.plan.durationValue <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "La duración del plan no es válida",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================================
     * PLAN FREE
     * ============================================================
     */

    if (application.plan.type === "FREE") {
      const result = await prisma.$transaction(async (tx) => {
        // Verificar si el usuario ya pertenece al club
        const existingMembership = await tx.clubMembership.findUnique({
          where: {
            userId_clubId: {
              userId: application.userId,
              clubId,
            },
          },
        });

        if (existingMembership) {
          throw new Error("MEMBERSHIP_ALREADY_EXISTS");
        }

        const startedAt = new Date();

        const expiresAt = new Date(startedAt);

        if (application.plan.durationUnit === "MONTH") {
          expiresAt.setMonth(
            expiresAt.getMonth() + application.plan.durationValue
          );
        } else if (application.plan.durationUnit === "YEAR") {
          expiresAt.setFullYear(
            expiresAt.getFullYear() + application.plan.durationValue
          );
        }

        // Crear la pertenencia al club
        const membership = await tx.clubMembership.create({
          data: {
            userId: application.userId,
            clubId,
            role: "MEMBER",
            status: "ACTIVE",
          },
        });

        // Crear la suscripción gratuita
        const subscription = await tx.subscription.create({
          data: {
            clubMembershipId: membership.id,
            planId: application.plan.id,
            status: "ACTIVE",
            startedAt,
            expiresAt,
          },
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                type: true,
                price: true,
                durationValue: true,
                durationUnit: true,
              },
            },
          },
        });

        return {
          membership,
          subscription,
        };
      });

      return NextResponse.json(
        {
          success: true,
          message:
            "Membresía gratuita activada correctamente",
          paymentRequired: false,
          status: "ACTIVE",
          membership: result.membership,
          subscription: result.subscription,
        },
        { status: 201 }
      );
    }

    /*
     * ============================================================
     * PLAN PAID
     * ============================================================
     */

    if (application.plan.type === "PAID") {
      return NextResponse.json({
        success: true,
        message:
          "La solicitud está aprobada y lista para iniciar el proceso de pago",
        paymentRequired: true,
        status: "READY_FOR_PAYMENT",
        application: {
          id: application.id,
          status: application.status,
        },
        plan: {
          id: application.plan.id,
          name: application.plan.name,
          description: application.plan.description,
          type: application.plan.type,
          price: application.plan.price,
          durationValue: application.plan.durationValue,
          durationUnit: application.plan.durationUnit,
          benefits: application.plan.benefits,
        },
      });
    }

    // Protección adicional por si apareciera un tipo de plan
    // no contemplado en la lógica.
    return NextResponse.json(
      {
        success: false,
        message: "El tipo de plan no es válido",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Membership payment readiness error:", error);

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

      if (error.message === "MEMBERSHIP_ALREADY_EXISTS") {
        return NextResponse.json(
          {
            success: false,
            message:
              "El usuario ya pertenece a este club",
          },
          { status: 409 }
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