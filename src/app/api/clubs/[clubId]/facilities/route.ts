import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const user = await requireAuth(request);

    const { clubId } = await context.params;

    const membership = await prisma.clubMembership.findFirst({
      where: {
        clubId,
        userId: user.id,
        role: "CLUB_ADMIN",
        status: "ACTIVE",
      },
    });

    if (!membership && user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "No tienes permisos para crear instalaciones en este club",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      name,
      description,
      location,
      capacity,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "El nombre de la instalación es obligatorio",
        },
        { status: 400 }
      );
    }

    if (
      capacity !== undefined &&
      capacity !== null &&
      (!Number.isInteger(capacity) || capacity <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "La capacidad debe ser un número entero mayor a 0",
        },
        { status: 400 }
      );
    }

    const facility = await prisma.facility.create({
      data: {
        clubId,
        name: name.trim(),
        description:
          description !== undefined && description !== null
            ? String(description).trim()
            : null,
        location:
          location !== undefined && location !== null
            ? String(location).trim()
            : null,
        capacity: capacity ?? null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        facility,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create facility error:", error);

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

export async function GET(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const user = await requireAuth(request);

    const { clubId } = await context.params;

    const membership = await prisma.clubMembership.findFirst({
      where: {
        clubId,
        userId: user.id,
        status: "ACTIVE",
      },
    });

    if (!membership && user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "No perteneces a este club",
        },
        { status: 403 }
      );
    }

    const facilities = await prisma.facility.findMany({
      where: {
        clubId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      facilities,
    });
  } catch (error) {
    console.error("Get facilities error:", error);

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