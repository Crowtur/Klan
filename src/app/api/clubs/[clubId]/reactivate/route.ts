import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireSuperAdmin } from "@/lib/auth/authorization";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ clubId: string }>;
  }
) {
  try {
    const user = await requireAuth(request);
    const { clubId } = await context.params;

    // Solo el SUPER_ADMIN puede reactivar clubes.
    await requireSuperAdmin(user.id);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!club) {
      return NextResponse.json(
        {
          success: false,
          message: "Club no encontrado",
        },
        { status: 404 }
      );
    }

    if (club.status !== "SUSPENDED") {
      return NextResponse.json(
        {
          success: false,
          message: "Solo se pueden reactivar clubes suspendidos",
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const result = await tx.club.updateMany({
        where: {
          id: clubId,
          status: "SUSPENDED",
        },
        data: {
          status: "ACTIVE",
        },
      });

      if (result.count === 0) {
        throw new Error("CLUB_STATUS_CHANGED");
      }

      // Recuperar acceso administrativo al club.
      await tx.clubMembership.updateMany({
        where: {
          clubId,
          role: "CLUB_ADMIN",
          status: "SUSPENDED",
        },
        data: {
          status: "ACTIVE",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Club reactivado correctamente",
      clubId,
      status: "ACTIVE",
    });
  } catch (error) {
    console.error("Reactivate club error:", error);

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

      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          {
            success: false,
            message: "Solo el SUPER_ADMIN puede reactivar clubes",
          },
          { status: 403 }
        );
      }

      if (error.message === "CLUB_STATUS_CHANGED") {
        return NextResponse.json(
          {
            success: false,
            message: "El estado del club cambió antes de procesar la solicitud",
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