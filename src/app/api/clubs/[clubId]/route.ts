import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin, requireClubMembership } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

// GET: Obtener información del club si se es miembro activo
export async function GET(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const user = await requireAuth(request);

    const { clubId } = await context.params;

    const membership = await requireClubMembership(
      user.id,
      clubId
    );

    return NextResponse.json({
      success: true,
      club: membership.club,
      membership: {
        id: membership.id,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt,
      },
    });
  } catch (error) {
    console.error("Get club error:", error);

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
            message: "No tienes acceso a este club",
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


// PATCH: Editar nombre, descripción y slug del club
export async function PATCH(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { clubId } = await context.params;

    await requireClubAdmin(user.id, clubId);

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { success: false, message: "Datos inválidos" },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    const allowedFields = ["name", "description", "slug","address","googleMapsUrl","clearCover","clearLogo","timeZone"];

    const invalidFields = Object.keys(data).filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Se enviaron campos que no pueden editarse",
          invalidFields,
        },
        { status: 400 }
      );
    }

    const updateData: {
      name?: string;
      description?: string | null;
      timeZone?:string;slug?: string; address?:string|null; googleMapsUrl?:string|null; coverUrl?:null;coverFileKey?:null;logoUrl?:null;logoFileKey?:null;
    } = {};

    if("timeZone" in data){
      if(data.timeZone!=="America/Guayaquil"&&data.timeZone!=="Pacific/Galapagos")return NextResponse.json({error:"Zona de Ecuador inválida"},{status:400});
      updateData.timeZone=data.timeZone;
    }
    for(const key of ["address","googleMapsUrl"] as const){
      if(!(key in data))continue;
      const value=data[key];
      if(value!==null && (typeof value!=="string" || value.length>2048 || (key==="googleMapsUrl" && !/^https:\/\//i.test(value)))) return NextResponse.json({error:"Dirección inválida"},{status:400});
      updateData[key]=typeof value==="string"?value.trim()||null:null;
    }
    if(data.clearCover===true) Object.assign(updateData,{coverUrl:null,coverFileKey:null});
    if(data.clearLogo===true) Object.assign(updateData,{logoUrl:null,logoFileKey:null});
    // Validar nombre
    if ("name" in data) {
      if (
        typeof data.name !== "string" ||
        (!data.name.trim() || data.name.trim().length > 50)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "El nombre debe ser un texto no vacío",
          },
          { status: 400 }
        );
      }

      updateData.name = data.name.trim();
    }

    // Validar descripción
    if ("description" in data) {
      if (
        data.description !== null &&
        (typeof data.description !== "string" || data.description.length > 200)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "La descripción debe ser texto o null",
          },
          { status: 400 }
        );
      }

      updateData.description =
        typeof data.description === "string"
          ? data.description.trim() || null
          : null;
    }

    // Validar slug
    if ("slug" in data) {
      if (
        typeof data.slug !== "string" ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug) ||
        data.slug.length > 80
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "El slug debe contener únicamente letras minúsculas, números y guiones internos (máximo 80 caracteres)",
          },
          { status: 400 }
        );
      }

      updateData.slug = data.slug;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Debes enviar al menos un campo para actualizar",
        },
        { status: 400 }
      );
    }

    // Actualizar únicamente si el club continúa activo.
    const updated = await prisma.club.updateMany({
      where: {
        id: clubId,
        status: "ACTIVE",
      },
      data: updateData,
    });

    if (updated.count === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "El club no existe o está suspendido",
        },
        { status: 409 }
      );
    }

    const club = await prisma.club.findUnique({
      where: { id: clubId },
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
          { success: false, message: "No autenticado" },
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

      // Prisma: violación de una restricción única.
      if (
        "code" in error &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "El slug ya está siendo utilizado por otro club",
          },
          { status: 409 }
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
