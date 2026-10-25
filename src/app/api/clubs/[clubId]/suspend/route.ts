
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubSuspensionPermission } from "@/lib/auth/authorization";
import { cancelClubSubscriptions } from "@/lib/clubs/cancel-club-subscriptions";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ clubId: string }>;
  }
) {
  try {
    const user = await requireAuth(request);
    const { clubId } = await context.params;

    await requireClubSuspensionPermission(user.id, clubId);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, status: true },
    });

    if (!club) {
      return NextResponse.json(
        { success: false, message: "Club no encontrado" },
        { status: 404 }
      );
    }

    // Suspender el club y sus miembros en una sola transacción.
    // No depende de que Stripe responda correctamente.
    await prisma.$transaction(async (tx) => {
      await tx.clubMembership.updateMany({
        where: {
          clubId,
          status: "ACTIVE",
        },
        data: {
          status: "SUSPENDED",
        },
      });

      await tx.club.update({
        where: { id: clubId },
        data: {
          status: "SUSPENDED",
        },
      });
    });

    // Intentar cancelar las suscripciones recurrentes.
    // Si falla Stripe, el club permanece suspendido.
    let stripeCancellationComplete = false;
    let cancelledSubscriptions = 0;
    let cancellationErrors: Array<{
      subscriptionId: string;
      message: string;
    }> = [];

    try {
      const result = await cancelClubSubscriptions(clubId);

      stripeCancellationComplete = result.success;
      cancelledSubscriptions = result.cancelled;
      cancellationErrors = result.errors;
    } catch (error) {
      console.error("Error de cancelación en Stripe:", error);

      cancellationErrors = [
        {
          subscriptionId: "GENERAL",
          message:
            error instanceof Error
              ? error.message
              : "Error desconocido al cancelar suscripciones",
        },
      ];
    }

    return NextResponse.json({
      success: true,
      message: stripeCancellationComplete
        ? "Club y membresías suspendidos correctamente"
        : "Club y membresías suspendidos. Algunas cancelaciones de Stripe requieren revisión o reintento.",
      clubId,
      status: "SUSPENDED",
      stripeCancellationComplete,
      cancelledSubscriptions,
      cancellationErrors,
    });
  } catch (error) {
    console.error("Suspend club error:", error);

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { success: false, message: "No autenticado" },
          { status: 401 }
        );
      }

      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { success: false, message: "No tienes permisos" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
