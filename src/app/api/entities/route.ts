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

// Refactorización Parte 11: altas y consultas mediante Entity y EntityMembership; ENTITY_ADMIN conserva el alcance de los permisos anteriores.

import {activeMember} from "@/lib/entities/active";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

// GET: Obtener todas las entidades a las que pertenece el usuario autenticado
/** Lista las entidades del usuario autenticado. */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const memberships = await prisma.entityMembership.findMany({
      where: {
        userId: user.id, ...activeMember(),
        entity: {
          status: "ACTIVE",
        },
      },
      include: {
        entity: {include:{_count:{select:{memberships:{where:activeMember()}}}}},
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    const entities = memberships.map((membership) => ({
      id: membership.entity.id,
      name: membership.entity.name,
      slug: membership.entity.slug,
      description: membership.entity.description,
      logoUrl: membership.entity.logoUrl, coverUrl: membership.entity.coverUrl, address: membership.entity.address,
      status: membership.entity.status,
      memberCount: membership.entity._count.memberships,
      role: membership.role,
      membershipStatus: membership.status,
      joinedAt: membership.joinedAt,
    }));

    return NextResponse.json({
      success: true,
      entities,
    });
  } catch (error) {
    console.error("Get entities error:", error);

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

// POST: Crear una nueva entidad y asignar al creador como ENTITY_ADMIN
/** Crea la entidad y establece la membresía administrativa inicial. */
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
    const existingEntity = await prisma.entity.findUnique({
      where: {
        slug,
      },
    });

    if (existingEntity) {
      return NextResponse.json(
        {
          success: false,
          message: "El slug de la entidad ya está registrado",
        },
        { status: 409 }
      );
    }

    const entity = await prisma.entity.create({
      data: {
        name: name.trim(),address,googleMapsUrl,
        slug,
        description,
        memberships: {
          create: {
            userId: user.id,
            role: "ENTITY_ADMIN",events:{create:{eventKey:crypto.randomUUID(),type:"JOINED",newRole:"ENTITY_ADMIN",newStatus:"ACTIVE",actorId:user.id}},
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
        message: "Entidad creada correctamente",
        entity,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create entidad error:", error);

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