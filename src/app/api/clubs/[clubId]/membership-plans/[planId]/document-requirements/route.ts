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
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

// POST: Crear requisito documental para un plan
/** Añade un requisito documental al plan del club. */
export async function POST(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      planId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);

    const { clubId, planId } = await context.params;

    await requireClubAdmin(user.id, clubId);

    const body = await request.json();

    const {
      name,
      description,
      isRequired,
    } = body;

    // Validación del nombre
    if (
      !name ||
      typeof name !== "string" ||
      !name.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El nombre del requisito es obligatorio",
        },
        { status: 400 }
      );
    }

    // Validación de isRequired
    if (
      isRequired !== undefined &&
      typeof isRequired !== "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "isRequired debe ser boolean",
        },
        { status: 400 }
      );
    }

    // Verificar que el plan pertenece al club
    const plan = await prisma.membershipPlan.findFirst({
      where: {
        id: planId,
        clubId,
      },
    });

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          message: "El plan no existe en este club",
        },
        { status: 404 }
      );
    }

    const requirement = await prisma.$transaction(async tx=>{
      await tx.membershipPlan.update({where:{id:planId},data:{requiresDocumentation:true}});
      const created =
      await tx.planDocumentRequirement.create({
        data: {
          planId,
          name: name.trim(),
          description:
            typeof description === "string" &&
            description.trim()
              ? description.trim()
              : null,
          isRequired: isRequired ?? true,
          isActive: true,
        },
      });

      return created;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Requisito documental creado correctamente",
        requirement,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create document requirement error:",
      error
    );

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
            message:
              "No tienes permisos para administrar los requisitos de este club",
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

// GET: Obtener requisitos documentales del plan
/** Lista los requisitos del plan para el editor documental. */
export async function GET(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      planId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);

    const { clubId, planId } = await context.params;

    await requireClubAdmin(user.id, clubId);

    // Verificar que el plan pertenece al club
    const plan = await prisma.membershipPlan.findFirst({
      where: {
        id: planId,
        clubId,
      },
    });

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          message: "El plan no existe en este club",
        },
        { status: 404 }
      );
    }

    const requirements =
      await prisma.planDocumentRequirement.findMany({
        where: {
          planId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    return NextResponse.json({
      success: true,
      requirements,
    });
  } catch (error) {
    console.error(
      "Get document requirements error:",
      error
    );

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
            message:
              "No tienes permisos para ver los requisitos de este club",
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