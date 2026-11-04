import {activeMember} from "@/lib/clubs/active";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Obtener parámetros de búsqueda.
    const query = (searchParams.get("q") ?? "").trim();
    const pageParam = searchParams.get("page") ?? "1";
    const limitParam = searchParams.get("limit") ?? "10";

    // 2. Validar la búsqueda.
    if (query.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "La búsqueda no puede superar los 100 caracteres",
        },
        { status: 400 }
      );
    }

    // 3. Validar paginación.
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

    // 4. Buscar únicamente clubes activos.


    const where = {
    status: "ACTIVE" as const,
    ...(query && {
        OR: [
        {
            name: {
            contains: query,
            mode: "insensitive" as const,
            },
        },
        {
            description: {
            contains: query,
            mode: "insensitive" as const,
            },
        },
        {
            slug: {
            contains: query,
            mode: "insensitive" as const,
            },
        },
        ],
    }),
    };

    // 5. Obtener resultados y total.
    const [clubs, total] = await prisma.$transaction([
      prisma.club.findMany({
        where,
        orderBy: [
          { name: "asc" },
          { id: "asc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true, address: true, coverUrl: true,
          _count: { select: { memberships: { where: activeMember() } } },
          createdAt: true,
        },
      }),
      prisma.club.count({ where }),
    ]);

    // 6. Devolver resultados.
    return NextResponse.json({
      success: true,
      query,
      clubs:clubs.map(club=>({...club,memberCount:club._count.memberships})),
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
    console.error("Search clubs error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
