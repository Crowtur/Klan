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


import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

/** Valida al autor antes de publicar contenido para el club. */
export async function POST(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { clubId } = await context.params;

    // 1. Verificar que el club exista y esté activo
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

    if (club.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "No se puede publicar en un club inactivo o suspendido",
        },
        { status: 403 }
      );
    }

    // 2. Verificar permisos contextuales
    if (user.globalRole !== "SUPER_ADMIN") {
      const membership = await prisma.clubMembership.findFirst({
        where: {
          clubId,
          userId: user.id,
          role: "CLUB_ADMIN",
          status: "ACTIVE",
        },
      });

      if (!membership) {
        return NextResponse.json(
          {
            success: false,
            message: "No tienes permisos para publicar en este club",
          },
          { status: 403 }
        );
      }
    }

    // 3. Leer y validar el contenido
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "El cuerpo de la solicitud debe ser JSON válido",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El cuerpo de la solicitud no es válido",
        },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;
    const { title, content } = data;

    if (
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El contenido de la publicación es obligatorio",
        },
        { status: 400 }
      );
    }

    if (
      title !== undefined &&
      title !== null &&
      typeof title !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El título debe ser un texto",
        },
        { status: 400 }
      );
    }

    const cleanTitle =
      typeof title === "string" ? title.trim() : "";

    if (cleanTitle.length > 150) {
      return NextResponse.json(
        {
          success: false,
          message: "El título no puede superar los 150 caracteres",
        },
        { status: 400 }
      );
    }

    if (content.trim().length > 5000) {
      return NextResponse.json(
        {
          success: false,
          message: "El contenido no puede superar los 5000 caracteres",
        },
        { status: 400 }
      );
    }

    // 4. Crear la publicación
    const post = await prisma.post.create({
      data: {
        clubId,
        authorId: user.id,
        title: cleanTitle || null,
        content: content.trim(),
      },
      include: {
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
    });

    return NextResponse.json(
      {
        success: true,
        message: "Publicación creada correctamente",
        post,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create post error:", error);

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


/** Pagina las publicaciones y permite localizar la página de una publicación compartida. */
export async function GET(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await context.params;

    // 1. Verificar que el club exista y esté activo.
    const club = await prisma.club.findUnique({
      where: {
        id: clubId,
      },
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

    if (club.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Las publicaciones de este club no están disponibles",
        },
        { status: 403 }
      );
    }

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
          message: "Los parámetros page y limit deben ser enteros positivos",
        },
        { status: 400 }
      );
    }

    let page = Number(pageParam);
    const limit = Number(limitParam);

    if (limit > 50 || (page - 1) * limit > 100000) {
      return NextResponse.json(
        {
          success: false,
          message: "Los parámetros de paginación exceden los límites permitidos",
        },
        { status: 400 }
      );
    }

    // 3. Consultar las publicaciones del club.
    const where = {
      clubId,
    };

    const anchor = searchParams.get("anchor");
    let anchorMissing = false;
    if (anchor) {
      const target = await prisma.post.findFirst({where:{id:anchor,clubId},select:{id:true,updatedAt:true}});
      if (target) {
        const ahead = await prisma.post.count({where:{clubId,OR:[{updatedAt:{gt:target.updatedAt}},{updatedAt:target.updatedAt,id:{gt:target.id}}]}});
        page = Math.floor(ahead/limit)+1;
      } else anchorMissing = true;
    }
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

    // 4. Devolver los resultados paginados.
    return NextResponse.json({
      success: true,
      posts, anchorMissing,
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
    console.error("Get club posts error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
