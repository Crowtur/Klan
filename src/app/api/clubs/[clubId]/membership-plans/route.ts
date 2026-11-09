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

// POST: Crear un plan de membresía
/** Define el precio, la vigencia y las condiciones de un plan nuevo. */
export async function POST(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { clubId } = await context.params;

    await requireClubAdmin(user.id, clubId);

    // Validar después del control de acceso conserva el 401/403 incluso con un cuerpo
    // defectuoso. Se distingue un error de sintaxis de un fallo inesperado del servidor.
    let body;
    try {
      body = await request.json();
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return NextResponse.json(
        { success: false, message: "El cuerpo debe contener JSON válido" },
        { status: 400 }
      );
    }

    // JSON admite valores escalares, arreglos y null; este contrato exige un objeto.
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Se esperaba un objeto JSON para el plan" },
        { status: 400 }
      );
    }

    // Informar todos los campos ausentes de una vez. El precio cero sigue siendo válido
    // para planes gratuitos y las reglas de negocio se aplican antes de la escritura.
    const missing = ["name", "type", "price", "durationValue", "durationUnit"]
      .filter(field => body[field] == null);
    if (missing.length) {
      return NextResponse.json(
        { success: false, message: `Campos requeridos faltantes: ${missing.join(", ")}`, fields: missing },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      type,
      price,
      durationValue,
      durationUnit,
      requiresDocumentation,
      benefits,
    } = body;

    // Validación de nombre
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "El nombre del plan es obligatorio",
        },
        { status: 400 }
      );
    }

    // Validación del tipo
    if (type !== "FREE" && type !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: "El tipo de plan debe ser FREE o PAID",
        },
        { status: 400 }
      );
    }

    // Rechazar importes fuera de Decimal(10,2) antes de enviar el precio a PostgreSQL.
    if (
      price === undefined ||
      price === null ||
      !Number.isFinite(price) ||
      price > 99_999_999.99 ||
      price < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El precio debe estar entre 0 y 99 999 999,99",
        },
        { status: 400 }
      );
    }

    // Los planes gratuitos deben tener precio 0
    if (type === "FREE" && price !== 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Un plan FREE debe tener un precio de 0",
        },
        { status: 400 }
      );
    }

    // Los planes pagados deben tener precio mayor a 0
    if (type === "PAID" && price <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Un plan PAID debe tener un precio mayor a 0",
        },
        { status: 400 }
      );
    }

    // Prisma Int utiliza 32 bits con signo para guardar la duración.
    if (
      durationValue === undefined ||
      !Number.isInteger(durationValue) ||
      durationValue > 2_147_483_647 ||
      durationValue <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "durationValue debe ser un entero mayor a 0",
        },
        { status: 400 }
      );
    }

    if (durationUnit !== "MONTH" && durationUnit !== "DAY" && durationUnit !== "YEAR") {
      return NextResponse.json(
        {
          success: false,
          message: "durationUnit debe ser DAY, MONTH o YEAR",
        },
        { status: 400 }
      );
    }

    // Validación de documentación
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

    const plan = await prisma.membershipPlan.create({
      data: {
        clubId,
        name: name.trim(),
        description:
          typeof description === "string" && description.trim()
            ? description.trim()
            : null,
        type,
        price,
        durationValue,
        durationUnit,
        billingMode: durationUnit === "DAY" ? "ONE_TIME" : "RECURRING",
        requiresDocumentation: requiresDocumentation ?? false,
        ...(benefits !== undefined && { benefits }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Plan de membresía creado correctamente",
        plan,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create membership plan error:", error);

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
            message: "No tienes permisos para administrar los planes de este club",
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

// GET: Obtener todos los planes del club
/** Lista los planes del club y la información utilizada para administrarlos. */
export async function GET(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { clubId } = await context.params;

    await requireClubAdmin(user.id, clubId);

    const plans = await prisma.membershipPlan.findMany({
      where: {
        clubId,
      },
      include: {
        documentRequirements: {
          where: {
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const now = new Date();
    const memberships = await prisma.subscription.findMany({
      where: {
        plan: { clubId }, clubMembership: { status: "ACTIVE", club: { status: "ACTIVE" } },
        startedAt: { lte: now },
        OR: [{ status: "ACTIVE", expiresAt: { gt: now } }, { status: "PENDING_PAYMENT", gracePeriodEndsAt: { gt: now } }],
      },
      distinct: ["planId", "clubMembershipId"], select: { planId: true, clubMembershipId: true },
    });
    const counts = new Map<string, number>();
    for (const { planId } of memberships) counts.set(planId, (counts.get(planId) || 0) + 1);
    return NextResponse.json({
      success: true,
      plans: plans.map(plan => ({...plan, activeMembers: counts.get(plan.id) || 0})),
    });
  } catch (error) {
    console.error("Get membership plans error:", error);

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
            message: "No tienes permisos para ver los planes de este club",
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