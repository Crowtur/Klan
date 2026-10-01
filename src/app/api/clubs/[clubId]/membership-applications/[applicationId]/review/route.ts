import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

// PATCH: Revisar solicitud de membresía (Aprobar / Rechazar por CLUB_ADMIN)
export async function PATCH(
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

    // Si el estado es REJECTED, la razón es obligatoria
    if (
      status === "REJECTED" &&
      (!rejectionReason ||
        typeof rejectionReason !== "string" ||
        !rejectionReason.trim())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Debe proporcionar una razón para rechazar la solicitud",
        },
        { status: 400 }
      );
    }

    const application = await prisma.membershipApplication.findFirst({
      where: {
        id: applicationId,
        plan: {
          clubId,
        },
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            requiresDocumentation: true,
            type: true, // Importante para saber si es PAID o FREE
          },
        },
        documents: {
          include: {
            requirement: {
              select: {
                id: true,
                name: true,
                isRequired: true,
                isActive: true,
              },
            },
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

    // Solo se pueden revisar solicitudes que estén PENDING o DOCUMENTATION_REVIEW
    if (
      application.status !== "PENDING" &&
      application.status !== "DOCUMENTATION_REVIEW"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Esta solicitud ya no puede ser revisada",
        },
        { status: 400 }
      );
    }

    // Si se aprueba y el plan requiere documentos, verificar que estén todos los obligatorios aprobados
    if (status === "APPROVED" && application.plan.requiresDocumentation) {
      const requiredRequirements =
        await prisma.planDocumentRequirement.findMany({
          where: {
            planId: application.plan.id,
            isActive: true,
            isRequired: true,
          },
        });

      const approvedDocumentIds = new Set(
        application.documents
          .filter((document) => document.status === "APPROVED")
          .map((document) => document.requirementId)
      );

      const missingDocuments = requiredRequirements.filter(
        (requirement) => !approvedDocumentIds.has(requirement.id)
      );

      if (missingDocuments.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "No se puede aprobar la solicitud porque existen documentos obligatorios pendientes o no aprobados",
            missingDocuments: missingDocuments.map((requirement) => ({
              id: requirement.id,
              name: requirement.name,
            })),
          },
          { status: 400 }
        );
      }
    }

    // Ejecutamos todo dentro de una transacción para asegurar consistencia
    const updatedApplication = await prisma.$transaction(async (tx) => {
      // 1. Actualizar solicitud
      const updatedApp = await tx.membershipApplication.update({
        where: {
          id: applicationId,
        },
        data: {
          status,
          reviewedAt: new Date(),
          reviewedById: user.id,
          rejectionReason: status === "REJECTED" ? rejectionReason.trim() : null,
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
            },
          },
        },
      });

      // 2. Si la solicitud fue APROBADA, gestionamos membresía y suscripción
      if (status === "APPROVED") {
        // Buscar o crear la membresía del usuario en el club
        let clubMembership = await tx.clubMembership.findUnique({
          where: {
            userId_clubId: {
              userId: updatedApp.userId,
              clubId: clubId,
            },
          },
        });

        if (!clubMembership) {
          clubMembership = await tx.clubMembership.create({
            data: {
              userId: updatedApp.userId,
              clubId: clubId,
              role: "MEMBER",
              status: "ACTIVE",
            },
          });
        }

        // Si el plan es PAID, creamos automáticamente la suscripción en PENDING_PAYMENT
        if (updatedApp.plan.type === "PAID") {
          const existingSubscription = await tx.subscription.findFirst({
            where: {
              clubMembershipId: clubMembership.id,
              planId: updatedApp.planId,
              status: {
                in: ["PENDING_PAYMENT", "ACTIVE"],
              },
            },
          });

          if (!existingSubscription) {
            await tx.subscription.create({
              data: {
                clubMembershipId: clubMembership.id,
                planId: updatedApp.planId,
                status: "PENDING_PAYMENT",
              },
            });
          }
        }
      }

      return updatedApp;
    });

    return NextResponse.json({
      success: true,
      message:
        status === "APPROVED"
          ? "Solicitud aprobada correctamente"
          : "Solicitud rechazada correctamente",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("Review membership application error:", error);

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
              "No tienes permisos para revisar solicitudes de este club",
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