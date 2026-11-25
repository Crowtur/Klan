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

// Refactorización Parte 12 (UI-Only): Se muestra 'Círculo/Círculos' al usuario manteniendo 'Entity' en código, rutas y BD.

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireEntityAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

// POST: Crear solicitud de membresía (Usuario)
/** Valida el plan y crea la solicitud de ingreso para el usuario autenticado. */
export async function POST(
  request: Request,
  context: {
    params: Promise<{
      entityId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);

    const { entityId } = await context.params;

    const body = await request.json();

    const { planId } = body;

    if (!planId || typeof planId !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "planId es obligatorio",
        },
        { status: 400 }
      );
    }

    // Verificar que el plan pertenece a la entidad
    const plan = await prisma.membershipPlan.findFirst({
      where: {
        id: planId,
        entityId,
        isActive: true,
      },
      include: {
        documentRequirements: {
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El plan no existe, no pertenece a este círculo o no está activo",
        },
        { status: 404 }
      );
    }

    // Verificar que el usuario no tenga ya una membresía activa
    const existingMembership = await prisma.entityMembership.findUnique({
      where: {
        userId_entityId: {
          userId: user.id,
          entityId,
        },
      },
    });

    if (existingMembership?.status === "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "El usuario ya pertenece a este círculo",
        },
        { status: 409 }
      );
    }

    // Verificar solicitudes pendientes existentes
    const existingApplication = await prisma.membershipApplication.findFirst({
      where: {
        userId: user.id,
        plan: {
          entityId,
        },
        status: {
          in: ["PENDING", "DOCUMENTATION_REVIEW"],
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ya tienes una solicitud de membresía pendiente para este círculo",
        },
        { status: 409 }
      );
    }

    // Crear solicitud
    const application = await prisma.$transaction(async tx => {
    const created = await tx.membershipApplication.create({
      data: {
        userId: user.id,
        planId,
        status: "PENDING",
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            price: true,
            durationValue: true,
            durationUnit: true,
            requiresDocumentation: true,
            benefits: true,
          },
        },
      },
    });

    const admins = await tx.entityMembership.findMany({where:{entityId,role:"ENTITY_ADMIN",status:"ACTIVE"},select:{userId:true}});
    await tx.notification.createMany({data:admins.map(admin=>({recipientId:admin.userId,entityId,type:"APPLICATION_SUBMITTED",eventKey:"apply:"+created.id,title:"Nueva solicitud de ingreso",targetType:"application",targetId:created.id,targetPath:"/app?view=entity&entity="+entityId})),skipDuplicates:true});
    return created;
    });
    return NextResponse.json(
      {
        success: true,
        message: "Solicitud de membresía creada correctamente",
        application,
        documentRequirements: plan.requiresDocumentation
          ? plan.documentRequirements
          : [],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create membership application error:", error);

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

// GET: Obtener solicitudes de la entidad
// Solo ENTITY_ADMIN puede acceder
/** Recupera las solicitudes que el administrador debe revisar en esta entidad. */
export async function GET(
  request: Request,
  context: {
    params: Promise<{
      entityId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);

    const { entityId } = await context.params;

    await requireEntityAdmin(user.id, entityId);

    const applications = await prisma.membershipApplication.findMany({
      where: {
        plan: {
          entityId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            type: true,
            price: true,
            durationValue: true,
            durationUnit: true,
            requiresDocumentation: true,
          },
        },
        documents: {
          select: {
            id: true,
            requirementId: true,
            status: true,
            uploadedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      applications,
    });
  } catch (error) {
    console.error("Get entidad membership applications error:", error);

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
              "No tienes permisos para revisar las solicitudes de este círculo",
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