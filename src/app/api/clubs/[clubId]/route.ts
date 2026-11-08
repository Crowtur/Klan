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
import { requireClubAdmin, requireClubMembership } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

// GET: Obtener información del club si se es miembro activo
/** Recupera la ficha interna desde el contexto de una membresía autorizada. */
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
      club: {...membership.club,_count:{memberships:await prisma.clubMembership.count({where:{clubId,status:"ACTIVE"}})}},
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
/** Actualiza el perfil del club y procesa la retirada de imágenes cuando corresponde. */
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
    const where = {id:clubId,status:"ACTIVE" as const};
    const updated = data.clearLogo===true ? await prisma.$transaction(async tx=>{
      const current=await tx.club.findUnique({where:{id:clubId},select:{logoFileKey:true}});
      if (!current) return {count:0};
      const result=await tx.club.updateMany({where:{...where,logoFileKey:current.logoFileKey},data:updateData});
      if (result.count && current.logoFileKey) {
        const fileKey=current.logoFileKey;
        await tx.avatarThumbnail.deleteMany({where:{key:fileKey}});
        await tx.pendingFileDeletion.upsert({where:{fileKey},create:{fileKey},update:{}});
      }
      return result;
    }) : await prisma.club.updateMany({where,data:updateData});

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
