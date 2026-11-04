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
        applicationId, deletedAt:null,
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

/**
 * POST: Registro manual de documentos deshabilitado.
 *
 * Los documentos se registran automáticamente mediante
 * membershipDocumentUploader en UploadThing.
 *
 * Esta medida evita que los clientes puedan registrar
 * URLs de archivos arbitrarios en PostgreSQL.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message:
        "El registro manual de documentos está deshabilitado. " +
        "Utiliza el endpoint membershipDocumentUploader de UploadThing.",
      code: "DOCUMENT_UPLOAD_VIA_UPLOADTHING",
    },
    {
      status: 410,
    }
  );
}