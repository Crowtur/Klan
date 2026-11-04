
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // 1. Obtener el usuario autenticado.
    const user = await requireAuth(request);

    // 2. Consultar únicamente sus membresías.
    const memberships = await prisma.clubMembership.findMany({
      where: {
        userId: user.id,
      },
      orderBy: [
        { joinedAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        role: true,
        status: true,
        joinedAt: true,
        removedAt: true, finishedAt: true,
        removalReason: true,

        club: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            status: true,
            logoUrl: true, coverUrl: true, address: true,
          },
        },
      },
    });

    // 3. Devolver los resultados.
    return NextResponse.json({
      success: true,
      memberships,
      total: memberships.length,
    });
  } catch (error) {
    console.error("Get my memberships error:", error);

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
