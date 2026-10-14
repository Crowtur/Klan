import { NextRequest, NextResponse } from "next/server";

// AJUSTAR estas rutas a tu proyecto:
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{
    clubId: string;
    memberId: string;
  }>;
};

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { clubId, memberId } = await params;

    // 1. Autenticación
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // 2. Autorización contextual
    const adminMembership = await requireClubAdmin(
      user.id,
      clubId
    );

    if (!adminMembership) {
      return NextResponse.json(
        { error: "No tienes permisos para administrar este club" },
        { status: 403 }
      );
    }

    // 3. Buscar la membresía objetivo
    const membership = await prisma.clubMembership.findFirst({
      where: {
        userId: memberId,
        clubId,
      },
      include: {
        subscriptions: {
          where: {
            status: {
              in: [
                "ACTIVE",
                "PENDING_PAYMENT",
                "SUSPENDED",
              ],
            },
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "El usuario no pertenece al club" },
        { status: 404 }
      );
    }

    // 4. Protecciones
    if (membership.userId === user.id) {
      return NextResponse.json(
        { error: "No puedes expulsarte a ti mismo" },
        { status: 403 }
      );
    }

    if (membership.role === "CLUB_ADMIN") {
      return NextResponse.json(
        { error: "No puedes expulsar a otro administrador" },
        { status: 403 }
      );
    }

    if (membership.status === "REMOVED") {
      return NextResponse.json(
        { error: "Este miembro ya fue expulsado" },
        { status: 409 }
      );
    }

    // 5. Motivo opcional
    let reason: string | null = null;

    const rawBody = await request.text();

    if (rawBody.trim()) {
      let body: unknown;

      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { error: "El cuerpo debe contener JSON válido" },
          { status: 400 }
        );
      }

      if (
        typeof body !== "object" ||
        body === null ||
        Array.isArray(body)
      ) {
        return NextResponse.json(
          { error: "El cuerpo debe ser un objeto JSON" },
          { status: 400 }
        );
      }

      const value = (body as Record<string, unknown>).reason;

      if (value !== undefined && value !== null) {
        if (typeof value !== "string" || value.length > 500) {
          return NextResponse.json(
            { error: "El motivo debe ser texto de hasta 500 caracteres" },
            { status: 400 }
          );
        }

        reason = value.trim() || null;
      }
    }

    // 6. Revocación inmediata y cancelación local
    // Se usa updateMany con condición de estado para evitar
    // que dos solicitudes expulsen simultáneamente al mismo miembro.
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.clubMembership.updateMany({
        where: {
          id: membership.id,
          status: { not: "REMOVED" },
          role: "MEMBER",
        },
        data: {
          status: "REMOVED",
          removedAt: new Date(),
          removedById: user.id,
          removalReason: reason,
        },
      });

      if (result.count !== 1) {
        return false;
      }

      await tx.subscription.updateMany({
        where: {
          clubMembershipId: membership.id,
          status: {
            in: [
              "ACTIVE",
              "PENDING_PAYMENT",
              "SUSPENDED",
            ],
          },
        },
        data: {
          status: "CANCELLED",
        },
      });

      return true;
    });

    if (!updated) {
      return NextResponse.json(
        { error: "La membresía ya fue modificada" },
        { status: 409 }
      );
    }

    // 7. Cancelar suscripciones en Stripe
    // La expulsión local ya está aplicada, aunque Stripe falle.
    const stripeErrors: string[] = [];

    for (const subscription of membership.subscriptions) {
      if (!subscription.stripeSubscriptionId) {
        continue;
      }

      try {
        await stripe.subscriptions.cancel(
          subscription.stripeSubscriptionId
        );
      } catch (error) {
        // Si Stripe ya la canceló, no debe considerarse
        // un fallo de negocio, pero este ejemplo no distingue
        // aún los distintos códigos de error de Stripe.
        console.error(
          "Error cancelando suscripción Stripe:",
          subscription.stripeSubscriptionId,
          error
        );

        stripeErrors.push(subscription.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Miembro expulsado del club",
      membershipStatus: "REMOVED",
      canReapply: true,
      stripeCancellationPending: stripeErrors.length > 0,
      pendingSubscriptionIds: stripeErrors,
    });
  } catch (error) {
    console.error("Error expulsando miembro:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}