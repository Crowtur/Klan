import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

// GET: Obtener documentos de una solicitud (Solo CLUB_ADMIN)
export async function GET(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      applicationId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);

    const { clubId, applicationId } = await context.params;

    await requireClubAdmin(user.id, clubId);

    const application = await prisma.membershipApplication.findFirst({
      where: {
        id: applicationId,
        plan: {
          clubId,
        },
      },
      select: {
        id: true,
        status: true,
        plan: {
          select: {
            id: true,
            name: true,
            requiresDocumentation: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        {
          success: false,
          message: "La solicitud no existe",
        },
        { status: 404 }
      );
    }

    const documents = await prisma.membershipDocument.findMany({
      where: {
        applicationId,
      },
      include: {
        requirement: {
          select: {
            id: true,
            name: true,
            description: true,
            isRequired: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
        plan: application.plan,
      },
      documents,
    });
  } catch (error) {
    console.error("Get application documents error:", error);

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
            message: "No tienes permisos para revisar estos documentos",
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

// POST: Cargar/Registrar documento de una solicitud (Socio/Aspirante)
export async function POST(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      applicationId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);

    const { clubId, applicationId } = await context.params;

    const body = await request.json();
    const { requirementId, fileUrl, fileName, mimeType } = body;

    if (!requirementId || typeof requirementId !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "requirementId es obligatorio",
        },
        { status: 400 }
      );
    }

    if (!fileUrl || typeof fileUrl !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "fileUrl es obligatorio",
        },
        { status: 400 }
      );
    }

    // Verificar que la solicitud pertenece al usuario y al club indicado
    const application = await prisma.membershipApplication.findFirst({
      where: {
        id: applicationId,
        userId: user.id,
        plan: {
          clubId,
        },
      },
      include: {
        plan: {
          select: {
            id: true,
            requiresDocumentation: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        {
          success: false,
          message: "La solicitud no existe",
        },
        { status: 404 }
      );
    }

    // Solo se pueden cargar documentos si la solicitud permite edición
    if (
      application.status !== "PENDING" &&
      application.status !== "DOCUMENTATION_REVIEW"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "La solicitud ya no permite cargar documentos",
        },
        { status: 400 }
      );
    }

    if (!application.plan.requiresDocumentation) {
      return NextResponse.json(
        {
          success: false,
          message: "Este plan no requiere documentación",
        },
        { status: 400 }
      );
    }

    // Verificar que el requisito pertenece al plan
    const requirement = await prisma.planDocumentRequirement.findFirst({
      where: {
        id: requirementId,
        planId: application.plan.id,
        isActive: true,
      },
    });

    if (!requirement) {
      return NextResponse.json(
        {
          success: false,
          message: "El requisito documental no existe o no está activo",
        },
        { status: 404 }
      );
    }

    // Evitar cargar dos documentos para el mismo requisito
    const existingDocument = await prisma.membershipDocument.findUnique({
      where: {
        applicationId_requirementId: {
          applicationId,
          requirementId,
        },
      },
    });

    if (existingDocument) {
      return NextResponse.json(
        {
          success: false,
          message: "Ya existe un documento para este requisito",
        },
        { status: 409 }
      );
    }

    const document = await prisma.membershipDocument.create({
      data: {
        applicationId,
        requirementId,
        fileUrl,
        fileName: typeof fileName === "string" ? fileName : null,
        mimeType: typeof mimeType === "string" ? mimeType : null,
        status: "PENDING",
      },
      include: {
        requirement: {
          select: {
            id: true,
            name: true,
            description: true,
            isRequired: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Documento cargado correctamente",
        document,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload membership document error:", error);

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