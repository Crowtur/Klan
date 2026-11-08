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

// GET: Obtener documentos de una solicitud (Solo CLUB_ADMIN)
/** Consulta los documentos de la solicitud para su revisión administrativa. */
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
/** Responde con 410 al registro manual de archivos. La carga válida se registra mediante UploadThing. */
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