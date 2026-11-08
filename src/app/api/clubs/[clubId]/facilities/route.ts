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

import { validFacilityIcon } from "@/lib/facility-icons";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

/** Crea una instalación vinculada al club tras validar sus atributos. */
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
    if (body.icon !== undefined && !validFacilityIcon(body.icon)) return NextResponse.json({message:"Icono de instalación inválido"},{status:400});


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
        ...(body.icon !== undefined && {icon:body.icon}),
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

/** Lista las instalaciones del club y admite la consulta de sugerencias para la barra lateral. */
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

    // The feed only needs one suggestion when the member has no booking history.
    if (new URL(request.url).searchParams.get("summary") === "popular") {
      const limit = new URL(request.url).searchParams.get("limit")==="2" ? 2 : 1;
      const ranked = await prisma.reservation.groupBy({
        by:["facilityId"],where:{facility:{clubId},status:"CONFIRMED"},
        _count:{facilityId:true},orderBy:[{_count:{facilityId:"desc"}},{facilityId:"asc"}],take:limit
      });
      const ids = ranked.map(row=>row.facilityId);
      const popular = await prisma.facility.findMany({where:{clubId,id:{in:ids}}});
      popular.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));
      const other = popular.length<limit ? await prisma.facility.findMany({
        where:{clubId,id:{notIn:ids}},orderBy:[{createdAt:"asc"},{id:"asc"}],take:limit-popular.length
      }) : [];
      return NextResponse.json({success:true,facilities:[...popular,...other]});
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