import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

// POST: Crear un plan de membresía
export async function POST(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { clubId } = await context.params;

    await requireClubAdmin(user.id, clubId);

    const body = await request.json();

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

    // Validación del precio
    if (
      price === undefined ||
      price === null ||
      typeof price !== "number" ||
      price < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El precio debe ser un número mayor o igual a 0",
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

    // Validación de duración
    if (
      durationValue === undefined ||
      !Number.isInteger(durationValue) ||
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

    return NextResponse.json({
      success: true,
      plans,
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