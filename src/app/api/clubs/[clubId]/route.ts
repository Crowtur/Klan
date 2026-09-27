import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const user = await requireAuth(request);

    const { clubId } = await context.params;

    await requireClubAdmin(user.id, clubId);

    const body = await request.json();

    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "El nombre es obligatorio",
        },
        { status: 400 }
      );
    }

    const club = await prisma.club.update({
      where: {
        id: clubId,
      },
      data: {
        name,
        description,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Club actualizado correctamente",
      club,
    });
  } catch (error) {
    console.error("Update club error:", error);

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
            message: "No tienes permisos para realizar esta acción",
          },
          { status: 403 }
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