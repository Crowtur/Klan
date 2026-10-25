
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // 1. Identificar al usuario autenticado.
    const user = await requireAuth(request);

    // 2. Obtener los parámetros de paginación.
    const { searchParams } = new URL(request.url);

    const pageParam = searchParams.get("page") ?? "1";
    const limitParam = searchParams.get("limit") ?? "10";

    const validPositiveInteger = (value: string) =>
      /^[1-9]\d*$/.test(value) &&
      Number.isSafeInteger(Number(value));

    if (
      !validPositiveInteger(pageParam) ||
      !validPositiveInteger(limitParam)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Los parámetros page y limit deben ser enteros positivos",
        },
        { status: 400 }
      );
    }

    const page = Number(pageParam);
    const limit = Number(limitParam);

    if (limit > 50 || (page - 1) * limit > 100000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Los parámetros de paginación exceden los límites permitidos",
        },
        { status: 400 }
      );
    }

    // 3. Filtrar publicaciones por membresía activa
    // y por clubes activos.
    const where = {
      club: {
        status: "ACTIVE" as const,
        memberships: {
          some: {
            userId: user.id,
            status: "ACTIVE" as const,
          },
        },
      },
    };

    // 4. Obtener publicaciones y cantidad total.
    const [posts, total] = await prisma.$transaction([
      prisma.post.findMany({
        where,
        orderBy: [
          { updatedAt: "desc" },
          { id: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          club: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
        },
      }),
      prisma.post.count({
        where,
      }),
    ]);

    // 5. Devolver el Feed paginado.
    return NextResponse.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get feed error:", error);

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
