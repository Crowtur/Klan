import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

// POST: Crear requisito documental para un plan
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

    const requirement =
      await prisma.planDocumentRequirement.create({
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