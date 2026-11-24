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
import { deleteUploadThingFile } from "@/lib/uploadthing-server";

type RouteContext = {
  params: Promise<{
    entityId: string;
    postId: string;
  }>;
};

/** Modifica el contenido de una publicación después de validar sus permisos. */
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    const { entityId, postId } = await context.params;

    // 1. Verificar que la entidad exista y esté activa.
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!entity) {
      return NextResponse.json(
        {
          success: false,
          message: "Entidad no encontrada",
        },
        { status: 404 }
      );
    }

    if (entity.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "No se pueden editar publicaciones de una entidad inactiva o suspendida",
        },
        { status: 403 }
      );
    }

    // 2. Verificar permisos administrativos.
    if (user.globalRole !== "SUPER_ADMIN") {
      const membership = await prisma.entityMembership.findFirst({
        where: {
          entityId,
          userId: user.id,
          role: "ENTITY_ADMIN",
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!membership) {
        return NextResponse.json(
          {
            success: false,
            message: "No tienes permisos para editar publicaciones de esta entidad",
          },
          { status: 403 }
        );
      }
    }

    // 3. Comprobar que la publicación pertenece a la entidad.
    const existingPost = await prisma.post.findFirst({
      where: {
        id: postId,
        entityId,
      },
      select: { id: true },
    });

    if (!existingPost) {
      return NextResponse.json(
        {
          success: false,
          message: "Publicación no encontrada en esta entidad",
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
    const { title, content,removeImage } = data;

    // 5. Exigir al menos un campo editable.
    if (
      title === undefined &&
      content === undefined && removeImage !== true
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
        entityId,
      },
      data: {
        ...(removeImage===true && {imageUrl:null,imageFileKey:null}),
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
        entity: {
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



/** Elimina la publicación identificada dentro de la entidad. */
export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);
    const { entityId, postId } = await context.params;

    // 1. Verificar que la entidad exista y esté activa.
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!entity) {
      return NextResponse.json(
        {
          success: false,
          message: "Entidad no encontrada",
        },
        { status: 404 }
      );
    }

    if (entity.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message:
            "No se pueden eliminar publicaciones de una entidad inactiva o suspendida",
        },
        { status: 403 }
      );
    }

    // 2. Verificar permisos administrativos.
    if (user.globalRole !== "SUPER_ADMIN") {
      const membership = await prisma.entityMembership.findFirst({
        where: {
          entityId,
          userId: user.id,
          role: "ENTITY_ADMIN",
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!membership) {
        return NextResponse.json(
          {
            success: false,
            message:
              "No tienes permisos para eliminar publicaciones de esta entidad",
          },
          { status: 403 }
        );
      }
    }

    // 3. Buscar la publicación y su imagen.
    const existingPost = await prisma.post.findFirst({
      where: {
        id: postId,
        entityId,
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
          message: "Publicación no encontrada en esta entidad",
        },
        { status: 404 }
      );
    }

    // 4. Eliminar el registro de la base de datos.
    const deleted = await prisma.post.deleteMany({
      where: {
        id: postId,
        entityId,
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
