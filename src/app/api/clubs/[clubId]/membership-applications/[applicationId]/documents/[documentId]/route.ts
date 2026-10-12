import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

// PATCH: Aprobar o Rechazar un documento individual (Solo CLUB_ADMIN)
export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      applicationId: string;
      documentId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);

    const { clubId, applicationId, documentId } = await context.params;

    // Verificar que el usuario sea administrador del club indicado
    await requireClubAdmin(user.id, clubId);

    const body = await request.json();
    const { status, rejectionReason } = body;

    // Validar estado recibido
    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json(
        {
          success: false,
          message: "El estado debe ser APPROVED o REJECTED",
        },
        { status: 400 }
      );
    }

    // Si se rechaza, la razón es obligatoria
    if (
      status === "REJECTED" &&
      (!rejectionReason ||
        typeof rejectionReason !== "string" ||
        !rejectionReason.trim())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Debe proporcionar una razón para rechazar el documento",
        },
        { status: 400 }
      );
    }

    // Verificar que el documento existe y pertenece a la solicitud y club indicados
    const document = await prisma.membershipDocument.findFirst({
      where: {
        id: documentId,
        applicationId,
        application: {
          plan: {
            clubId,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          message: "El documento no existe",
        },
        { status: 404 }
      );
    }

    // Actualizar estado del documento
    const updatedDocument = await prisma.membershipDocument.update({
      where: {
        id: documentId,
      },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason.trim() : null,
        reviewedAt: new Date(),
        reviewedById: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        status === "APPROVED"
          ? "Documento aprobado correctamente"
          : "Documento rechazado correctamente",
      document: updatedDocument,
    });
  } catch (error) {
    console.error("Review membership document error:", error);

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
            message: "No tienes permisos para revisar este documento",
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