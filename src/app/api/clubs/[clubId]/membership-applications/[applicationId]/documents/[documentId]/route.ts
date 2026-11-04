
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    clubId: string;
    applicationId: string;
    documentId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const user = await requireAuth(request);

    const { clubId, applicationId, documentId } =
      await context.params;

    await requireClubAdmin(user.id, clubId);

    const body = await request.json();

    const { status, rejectionReason } = body;

    if (
      status !== "APPROVED" &&
      status !== "REJECTED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El estado debe ser APPROVED o REJECTED",
        },
        { status: 400 }
      );
    }

    if (
      status === "REJECTED" &&
      (
        typeof rejectionReason !== "string" ||
        !rejectionReason.trim()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Debes proporcionar una razón para rechazar el documento",
        },
        { status: 400 }
      );
    }

    // Verificar que el documento pertenece
    // a la solicitud y al club.
    const document =
      await prisma.membershipDocument.findFirst({
        where: {
          id: documentId,
          applicationId,
          application: {
            plan: {
              clubId,
            },
          },
        },
        select: {
          id: true,
          status: true, version:true,
          application: {
            select: {
              status: true,userId:true,
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

    // Solo se pueden revisar solicitudes abiertas.
    if (
      document.application.status !== "PENDING" &&
      document.application.status !==
        "DOCUMENTATION_REVIEW"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La solicitud ya no permite revisar documentos",
        },
        { status: 409 }
      );
    }

    // No permitir cambiar decisiones anteriores.
    if (document.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Este documento ya fue revisado",
        },
        { status: 409 }
      );
    }

    // Actualización condicional para evitar
    // que dos administradores revisen el mismo
    // documento simultáneamente.
    const updated = await prisma.$transaction(async tx=>{const result=await tx.membershipDocument.updateMany({
      where: {
        id: documentId,
        applicationId,
        status: "PENDING", deletedAt:null, version: body.version ?? 1,
        application: {
          status: {
            in: [
              "PENDING",
              "DOCUMENTATION_REVIEW",
            ],
          },
          plan: {
            clubId,
          },
        },
      },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedById: user.id,
        rejectionReason:
          status === "REJECTED"
            ? rejectionReason.trim()
            : null,
      },
    });

    if(result.count)await tx.notification.create({data:{recipientId:document.application.userId,clubId,entityType:"document",entityId:documentId,eventKey:"review:"+documentId+":"+document.version,type:status==="APPROVED"?"DOCUMENT_APPROVED":"DOCUMENT_REJECTED",title:status==="APPROVED"?"Documento aprobado":"Documento rechazado",targetPath:"/app?view=applications"}});
    return result;});
    if (updated.count !== 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El documento o la solicitud cambiaron de estado. Actualiza la información e inténtalo nuevamente.",
        },
        { status: 409 }
      );
    }

    const updatedDocument =
      await prisma.membershipDocument.findUniqueOrThrow({
        where: {
          id: documentId,
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
    console.error(
      "Review membership document error:",
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
              "No tienes permisos para revisar este documento",
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

export async function DELETE(request:Request,context:RouteContext){
  try{
    const user=await requireAuth(request);
    const {clubId,documentId,applicationId}=await context.params;
    const result=await prisma.membershipDocument.updateMany({where:{id:documentId,applicationId,deletedAt:null,application:{userId:user.id,plan:{clubId},status:{in:["PENDING","DOCUMENTATION_REVIEW"]}}},data:{deletedAt:new Date()}});
    return NextResponse.json({success:result.count===1},{status:result.count?200:404});
  }catch(e){return NextResponse.json({success:false},{status:e instanceof Error&&e.message==="UNAUTHORIZED"?401:500});}
}
