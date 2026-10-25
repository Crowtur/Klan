
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
import { deleteUploadThingFile } from "@/lib/uploadthing-server";

type RouteContext = {
  params: Promise<{
    clubId: string;
    postId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    const { clubId, postId } = await context.params;

    // 1. Verificar que el club exista y esté activo.
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
          message: "No se pueden editar publicaciones de un club inactivo o suspendido",
        },
        { status: 403 }
      );
    }

    // 2. Verificar permisos administrativos.
    if (user.globalRole !== "SUPER_ADMIN") {
      const membership = await prisma.clubMembership.findFirst({
        where: {
          clubId,
          userId: user.id,
          role: "CLUB_ADMIN",
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!membership) {
        return NextResponse.json(
          {
            success: false,
            message: "No tienes permisos para editar publicaciones de este club",
          },
          { status: 403 }
        );
      }
    }

    // 3. Comprobar que la publicación pertenece al club.
    const existingPost = await prisma.post.findFirst({
      where: {
        id: postId,
        clubId,
      },
      select: { id: true },
    });

    if (!existingPost) {
      return NextResponse.json(
        {
          success: false,
          message: "Publicación no encontrada en este club",
        },
        { status: 404 }
      );
    }

    // 4. Leer el JSON.
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

    // 5. Exigir al menos un campo editable.
    if (
      title === undefined &&
      content === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Debes proporcionar title o content",
        },
        { status: 400 }
      );
    }

    // 6. Validar el título, si fue enviado.
    if (
      title !== undefined &&
      title !== null &&
      typeof title !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El título debe ser un texto o null",
        },
        { status: 400 }
      );
    }

    if (
      typeof title === "string" &&
      title.trim().length > 150
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El título no puede superar los 150 caracteres",
        },
        { status: 400 }
      );
    }

    // 7. Validar el contenido, si fue enviado.
    if (
      content !== undefined &&
      (
        typeof content !== "string" ||
        content.trim().length === 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El contenido debe ser un texto no vacío",
        },
        { status: 400 }
      );
    }

    if (
      typeof content === "string" &&
      content.trim().length > 5000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El contenido no puede superar los 5000 caracteres",
        },
        { status: 400 }
      );
    }

    // 8. Actualizar únicamente los campos permitidos.
    const post = await prisma.post.update({
      where: {
        id: postId,
        clubId,
      },
      data: {
        ...(title !== undefined && {
          title:
            typeof title === "string"
              ? title.trim() || null
              : null,
        }),
        ...(typeof content === "string" && {
          content: content.trim(),
        }),
      },
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
    });

    return NextResponse.json({
      success: true,
      message: "Publicación actualizada correctamente",
      post,
    });
  } catch (error) {
    console.error("Update post error:", error);

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



export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    const { clubId, postId } = await context.params;

    // 1. Verificar que el club exista y esté activo.
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
          message:
            "No se pueden eliminar publicaciones de un club inactivo o suspendido",
        },
        { status: 403 }
      );
    }

    // 2. Verificar permisos administrativos.
    if (user.globalRole !== "SUPER_ADMIN") {
      const membership = await prisma.clubMembership.findFirst({
        where: {
          clubId,
          userId: user.id,
          role: "CLUB_ADMIN",
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!membership) {
        return NextResponse.json(
          {
            success: false,
            message:
              "No tienes permisos para eliminar publicaciones de este club",
          },
          { status: 403 }
        );
      }
    }

    // 3. Buscar la publicación y su imagen.
    const existingPost = await prisma.post.findFirst({
      where: {
        id: postId,
        clubId,
      },
      select: {
        id: true,
        imageFileKey: true,
      },
    });

    if (!existingPost) {
      return NextResponse.json(
        {
          success: false,
          message: "Publicación no encontrada en este club",
        },
        { status: 404 }
      );
    }

    // 4. Eliminar el registro de la base de datos.
    const deleted = await prisma.post.deleteMany({
      where: {
        id: postId,
        clubId,
      },
    });

    if (deleted.count !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "La publicación ya no está disponible",
        },
        { status: 404 }
      );
    }

    // 5. Limpiar la imagen asociada, si existe.
    if (existingPost.imageFileKey) {
      try {
        const references = await prisma.post.count({
          where: {
            imageFileKey: existingPost.imageFileKey,
          },
        });

        if (references === 0) {
          await deleteUploadThingFile(
            existingPost.imageFileKey
          );
        }
      } catch (error) {
        console.error(
          "No se pudo eliminar la imagen de UploadThing:",
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Publicación eliminada correctamente",
    });
  } catch (error) {
    console.error("Delete post error:", error);

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
