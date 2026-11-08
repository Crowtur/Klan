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

// GET: Obtener un plan específico
// Solo CLUB_ADMIN puede acceder
/** Lee el plan identificado dentro del club. */
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

    const plan = await prisma.membershipPlan.findFirst({
      where: {
        id: planId,
        clubId,
      },
      include: {
        documentRequirements: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          message: "Plan de membresía no encontrado",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("Get membership plan error:", error);

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
            message: "No tienes permisos para ver este plan",
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

// PATCH: Actualizar un plan específico
// Solo CLUB_ADMIN puede actualizar
/** Valida los cambios de precio, duración y condiciones del plan. */
export async function PATCH(
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

    const existingPlan = await prisma.membershipPlan.findFirst({
      where: {
        id: planId,
        clubId,
      },
    });

    if (!existingPlan) {
      return NextResponse.json(
        {
          success: false,
          message: "Plan de membresía no encontrado",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    const {
      name,
      description,
      type,
      price,
      durationValue,
      durationUnit,benefits,
      requiresDocumentation,
      isActive,
    } = body;

    // Validar nombre si fue enviado
    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El nombre del plan no puede estar vacío",
        },
        { status: 400 }
      );
    }

    // Determinar valores finales
    const finalType = type ?? existingPlan.type;
    const finalPrice = price ?? Number(existingPlan.price);

    // Validar tipo
    if (finalType !== "FREE" && finalType !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: "El tipo de plan debe ser FREE o PAID",
        },
        { status: 400 }
      );
    }

    // Validar precio
    if (
      typeof finalPrice !== "number" ||
      finalPrice < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El precio debe ser un número mayor o igual a 0",
        },
        { status: 400 }
      );
    }

    if (finalType === "FREE" && finalPrice !== 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Un plan FREE debe tener un precio de 0",
        },
        { status: 400 }
      );
    }

    if (finalType === "PAID" && finalPrice <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Un plan PAID debe tener un precio mayor a 0",
        },
        { status: 400 }
      );
    }

    // Validar duración si fue enviada
    if (
      durationValue !== undefined &&
      (!Number.isInteger(durationValue) || durationValue <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "durationValue debe ser un entero mayor a 0",
        },
        { status: 400 }
      );
    }

    if (
      durationUnit !== undefined &&
      durationUnit !== "MONTH" &&
      durationUnit !== "DAY" && durationUnit !== "YEAR"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "durationUnit debe ser DAY, MONTH o YEAR",
        },
        { status: 400 }
      );
    }

    if (
      requiresDocumentation !== undefined &&
      typeof requiresDocumentation !== "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "requiresDocumentation debe ser boolean",
        },
        { status: 400 }
      );
    }

    if (
      isActive !== undefined &&
      typeof isActive !== "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "isActive debe ser boolean",
        },
        { status: 400 }
      );
    }

    const plan = await prisma.membershipPlan.update({
      where: {
        id: planId,
      },
      data: {
        ...(name !== undefined && {
          name: name.trim(),
        }),

        ...(description !== undefined && {
          description:
            typeof description === "string" && description.trim()
              ? description.trim()
              : null,
        }),

        ...(type !== undefined && {
          type,
        }),

        ...(price !== undefined && {
          price,
        }),

        ...(benefits !== undefined && {benefits}),
        ...(durationValue !== undefined && {
          durationValue,
        }),

        ...(durationUnit !== undefined && {
          durationUnit,
        billingMode: durationUnit === "DAY" ? "ONE_TIME" : "RECURRING",
        }),

        ...(requiresDocumentation !== undefined && {
          requiresDocumentation,
        }),

        ...(isActive !== undefined && {
          isActive,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Plan de membresía actualizado correctamente",
      plan,
    });
  } catch (error) {
    console.error("Update membership plan error:", error);

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
            message: "No tienes permisos para actualizar este plan",
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

// DELETE: Desactivar un plan (Soft delete)
// Solo CLUB_ADMIN puede desactivar
/** Desactiva la oferta del plan y conserva su identidad para los registros relacionados. */
export async function DELETE(
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

    const existingPlan = await prisma.membershipPlan.findFirst({
      where: {
        id: planId,
        clubId,
      },
    });

    if (!existingPlan) {
      return NextResponse.json(
        {
          success: false,
          message: "Plan de membresía no encontrado",
        },
        { status: 404 }
      );
    }

    if (!existingPlan.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "El plan ya está desactivado",
        },
        { status: 400 }
      );
    }

    const plan = await prisma.membershipPlan.update({
      where: {
        id: planId,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Plan de membresía desactivado correctamente",
      plan,
    });
  } catch (error) {
    console.error("Delete membership plan error:", error);

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
            message: "No tienes permisos para desactivar este plan",
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