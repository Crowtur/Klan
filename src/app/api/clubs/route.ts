import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

// GET: Obtener todos los clubes a los que pertenece el usuario autenticado
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const memberships = await prisma.clubMembership.findMany({
      where: {
        userId: user.id,
        status: "ACTIVE",
        club: {
          status: "ACTIVE",
        },
      },
      include: {
        club: true,
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    const clubs = memberships.map((membership) => ({
      id: membership.club.id,
      name: membership.club.name,
      slug: membership.club.slug,
      description: membership.club.description,
      status: membership.club.status,
      role: membership.role,
      membershipStatus: membership.status,
      joinedAt: membership.joinedAt,
    }));

    return NextResponse.json({
      success: true,
      clubs,
    });
  } catch (error) {
    console.error("Get clubs error:", error);

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

// POST: Crear un nuevo club y asignar al creador como CLUB_ADMIN
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);

    const body = await request.json();

    const { name, slug, description } = body;

    if (!name || !slug) {
      return NextResponse.json(
        {
          success: false,
          message: "El nombre y el slug son obligatorios",
        },
        { status: 400 }
      );
    }

    const existingClub = await prisma.club.findUnique({
      where: {
        slug,
      },
    });

    if (existingClub) {
      return NextResponse.json(
        {
          success: false,
          message: "El slug del club ya está registrado",
        },
        { status: 409 }
      );
    }

    const club = await prisma.club.create({
      data: {
        name,
        slug,
        description,
        memberships: {
          create: {
            userId: user.id,
            role: "CLUB_ADMIN",
          },
        },
      },
      include: {
        memberships: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Club creado correctamente",
        club,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create club error:", error);

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