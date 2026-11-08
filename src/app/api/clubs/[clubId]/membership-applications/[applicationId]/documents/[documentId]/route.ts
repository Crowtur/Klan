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

import { removeQueuedFile } from "@/lib/document-cleanup";

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

/** Registra la revisión del documento comprobando su versión. */
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
    const updated = await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "MembershipApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      const result=await tx.membershipDocument.updateMany({
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
    if (result.count && (status === "REJECTED" || await tx.membershipDocument.count({
      where: {applicationId, deletedAt:null, status:"REJECTED"}
    }))) {
      await tx.membershipApplication.updateMany({
        where: {id:applicationId, status:"DOCUMENTATION_REVIEW", documents:{none:{deletedAt:null,status:"PENDING"}}},
        data: {status:"PENDING"}
      });
    }
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

/** Retira el archivo del solicitante y deja su eliminación física en una cola recuperable. */
export async function DELETE(request:Request, context:RouteContext) {
  try {
    const user = await requireAuth(request);
    const {clubId, documentId, applicationId} = await context.params;
    const version = new URL(request.url).searchParams.get("version");
    const withdrawn = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "MembershipApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      const doc = await tx.membershipDocument.findFirst({
        where: {id:documentId, applicationId, application:{userId:user.id, plan:{clubId},status:{in:["PENDING","DOCUMENTATION_REVIEW"]}}}
      });
      if (!doc) return {status:404, fileKey:null};
      if (doc.deletedAt) return {status:200,fileKey:null};
      if (doc.status==="APPROVED" || version!==null && Number(version)!==doc.version) return {status:409,fileKey:null};
      const updated = await tx.membershipDocument.updateMany({
        where: {id:doc.id,version:doc.version,deletedAt:null,status:doc.status},
        data: {deletedAt:new Date(),version:{increment:1},fileKey:null,fileUrl:""}
      });
      if (!updated.count) return {status:409,fileKey:null};
      if (doc.fileKey) await tx.pendingFileDeletion.upsert({
        where: {fileKey:doc.fileKey}, create:{fileKey:doc.fileKey}, update:{}
      });
      await tx.membershipApplication.updateMany({
        where:{id:applicationId,status:"DOCUMENTATION_REVIEW",documents:{none:{deletedAt:null,status:"PENDING"}}},
        data:{status:"PENDING"}
      });
      return {status:200,fileKey:doc.fileKey};
    });
    if (withdrawn.status!==200) return NextResponse.json({success:false,message:"El documento cambió o ya no está disponible."},{status:withdrawn.status});
    const removed = !withdrawn.fileKey || await removeQueuedFile(withdrawn.fileKey);
    return NextResponse.json({success:true,message:removed?"Archivo retirado.":"Archivo retirado. La eliminación en el almacenamiento está pendiente de reintento."});
  } catch(error) {
    return NextResponse.json({success:false},{status:error instanceof Error && error.message==="UNAUTHORIZED"?401:500});
  }
}
