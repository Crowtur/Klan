/**
 * ==============================================================================
 * PONTIFICIA UNIVERSIDAD CATÓLICA DEL ECUADOR
 * Facultad Internacional de Innovación (PUCE - Icam)
 * ==============================================================================
 * 
 * PROYECTO DE TITULACIÓN - INGENIERÍA INTEGRAL
 * Autor: Diego Alexis Tipán Zambrano
 * Director del Proyecto: PhD. Rafael Melgarejo
 * Promoción: Primera Promoción (Año 2026)
 * 
 * ------------------------------------------------------------------------------
 * DECLARACIÓN SOBRE EL USO DE INTELIGENCIA ARTIFICIAL
 * ------------------------------------------------------------------------------
 * Se declara formalmente el uso de herramientas de Inteligencia Artificial como
 * soporte y asistente técnico para el desarrollo de este proyecto, destacando su
 * aplicación en:
 * 
 * - Generación y optimización de bloques de código repetitivos y extensos.
 * - Desarrollos de endpoints complejos con variabilidad de permisos y roles.
 * - Integración de nuevas funciones y sugerencias de arquitectura de software.
 * - Depuración ágil, corrección de errores y optimización de rendimiento.
 * - Creación, maquetación e integración de diseños UI/UX de formato visual a código.
 * - Automatización de documentación técnica y estructuración de comentarios.
 * 
 * Herramientas de IA utilizadas:
 * - GPT-5.6 Luna
 * - GPT-6 Astra
 * - Gemini 3.6 Flash
 * - Figma AI (Visual Engine / Make Real)
 * 
 * ------------------------------------------------------------------------------
 * DERECHOS DE AUTOR Y PROPIEDAD INTELECTUAL
 * ------------------------------------------------------------------------------
 * Los derechos del presente proyecto corresponden a la Pontificia Universidad
 * Católica del Ecuador junto al autor y al director del proyecto, en estricto
 * cumplimiento del reglamento institucional sobre patentes, tesis y titulación.
 * 
 * ALCANCE: Dichos derechos aplican exclusivamente al código fuente desarrollado
 * en este proyecto, excluyendo la idea de negocio global y futuras versiones 
 * o derivados sustanciales que puedan desarrollarse sobre el sistema.
 * ==============================================================================
 */

import {activeMember} from "@/lib/clubs/active";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/** Busca clubes del catálogo aplicando los filtros y los límites de paginación. */
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
