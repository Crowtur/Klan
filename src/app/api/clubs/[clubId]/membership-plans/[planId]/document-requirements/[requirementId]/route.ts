import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

// PATCH: Actualizar requisito documental
export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      planId: string;
      requirementId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);

    const {
      clubId,
      planId,
      requirementId,
    } = await context.params;

    await requireClubAdmin(user.id, clubId);

    const body = await request.json();

    const {
      name,
      description,
      isRequired,
      isActive,
    } = body;

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

    // Verificar que el requisito pertenece al plan
    const requirement =
      await prisma.planDocumentRequirement.findFirst({
        where: {
          id: requirementId,
          planId,
        },
      });

    if (!requirement) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El requisito documental no existe en este plan",
        },
        { status: 404 }
      );
    }

    // Validación de name
    if (
      name !== undefined &&
      (
        typeof name !== "string" ||
        !name.trim()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "El nombre debe ser un texto válido",
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

    // Validación de isActive
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

    const data: {
      name?: string;
      description?: string | null;
      isRequired?: boolean;
      isActive?: boolean;
    } = {};

    if (name !== undefined) {
      data.name = name.trim();
    }

    if (description !== undefined) {
      data.description =
        typeof description === "string" &&
        description.trim()
          ? description.trim()
          : null;
    }

    if (isRequired !== undefined) {
      data.isRequired = isRequired;
    }

    if (isActive !== undefined) {
      data.isActive = isActive;
    }

    const updatedRequirement =
      await prisma.planDocumentRequirement.update({
        where: {
          id: requirementId,
        },
        data,
      });

    return NextResponse.json({
      success: true,
      message:
        "Requisito documental actualizado correctamente",
      requirement: updatedRequirement,
    });
  } catch (error) {
    console.error(
      "Update document requirement error:",
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


// DELETE: Desactivar requisito documental
export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      planId: string;
      requirementId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);

    const {
      clubId,
      planId,
      requirementId,
    } = await context.params;

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

    // Verificar que el requisito pertenece al plan
    const requirement =
      await prisma.planDocumentRequirement.findFirst({
        where: {
          id: requirementId,
          planId,
        },
      });

    if (!requirement) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El requisito documental no existe en este plan",
        },
        { status: 404 }
      );
    }

    if (!requirement.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El requisito documental ya está desactivado",
        },
        { status: 400 }
      );
    }

    await prisma.planDocumentRequirement.update({
      where: {
        id: requirementId,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Requisito documental desactivado correctamente",
    });
  } catch (error) {
    console.error(
      "Delete document requirement error:",
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