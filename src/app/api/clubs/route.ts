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
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

// GET: Obtener todos los clubes a los que pertenece el usuario autenticado
/** Lista los clubes del usuario autenticado. */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const memberships = await prisma.clubMembership.findMany({
      where: {
        userId: user.id, ...activeMember(),
        club: {
          status: "ACTIVE",
        },
      },
      include: {
        club: {include:{_count:{select:{memberships:{where:activeMember()}}}}},
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
      logoUrl: membership.club.logoUrl, coverUrl: membership.club.coverUrl, address: membership.club.address,
      status: membership.club.status,
      memberCount: membership.club._count.memberships,
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
/** Crea el club y establece la membresía administrativa inicial. */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);

    const body = await request.json();

    const { name, slug, description } = body;

    if (typeof name !== "string" || !name.trim() || name.trim().length > 50 || typeof slug !== "string" || slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || (description != null && (typeof description !== "string" || description.length > 200))) {
      return NextResponse.json(
        {
          success: false,
          message: "El nombre y el slug son obligatorios",
        },
        { status: 400 }
      );
    }

    const {address,googleMapsUrl}=body;
    if((address!=null && (typeof address!=="string"||address.length>2048))||(googleMapsUrl!=null && (typeof googleMapsUrl!=="string"||googleMapsUrl.length>2048||!/^https:\/\//i.test(googleMapsUrl))))return NextResponse.json({error:"Dirección inválida"},{status:400});
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
        name: name.trim(),address,googleMapsUrl,
        slug,
        description,
        memberships: {
          create: {
            userId: user.id,
            role: "CLUB_ADMIN",events:{create:{eventKey:crypto.randomUUID(),type:"JOINED",newRole:"CLUB_ADMIN",newStatus:"ACTIVE",actorId:user.id}},
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