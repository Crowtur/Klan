import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

/**
 * Calcula la fecha de expiración sumando meses o años exactos según el calendario UTC,
 * ajustando automáticamente al último día del mes en caso de desfase (ej. 31 Ene -> 28/29 Feb).
 */
function calculateExpirationDate(
  startDate: Date,
  durationValue: number,
  durationUnit: "MONTH" | "YEAR" | "DAY"
): Date {
  if (durationUnit === "DAY") return new Date(startDate.getTime() + durationValue * 86400000);
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth();
  const day = startDate.getUTCDate();

  const monthsToAdd =
    durationUnit === "YEAR"
      ? durationValue * 12
      : durationValue;

  const targetFirstDay = new Date(
    Date.UTC(year, month + monthsToAdd, 1)
  );

  const targetYear = targetFirstDay.getUTCFullYear();
  const targetMonth = targetFirstDay.getUTCMonth();

  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate();

  const targetDay = Math.min(
    day,
    lastDayOfTargetMonth
  );

  const result = new Date(startDate);
  result.setUTCFullYear(
    targetYear,
    targetMonth,
    targetDay
  );

  return result;
}

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
            type: true,
            price: true,
            durationValue: true,
            durationUnit: true, billingMode: true,
            isActive: true,
          },
        },
        documents: { where:{deletedAt:null},
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

    // Validaciones del plan al intentar aprobar
    if (status === "APPROVED") {
      if (!application.plan.isActive) {
        return NextResponse.json(
          {
            success: false,
            message: "El plan ya no está activo",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(application.plan.durationValue) ||
        application.plan.durationValue <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "La duración del plan no es válida",
          },
          { status: 400 }
        );
      }

      if (
        application.plan.type === "PAID" &&
        Number(application.plan.price) <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "El precio del plan no es válido",
          },
          { status: 400 }
        );
      }
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
    const result = await prisma.$transaction(async (tx) => {
      // Evitar que dos administradores revisen la misma solicitud simultáneamente
      const updatedCount =
        await tx.membershipApplication.updateMany({
          where: {
            id: applicationId,
            status: {
              in: ["PENDING", "DOCUMENTATION_REVIEW"],
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

      if (updatedCount.count !== 1) {
        throw new Error("APPLICATION_ALREADY_REVIEWED");
      }

      const updatedApp =
        await tx.membershipApplication.findUniqueOrThrow({
          where: { id: applicationId },
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
                durationUnit: true, billingMode: true,
              },
            },
          },
        });

      let subscriptionId: string | null = null;

      if (status === "APPROVED") {
        const now = new Date();

        // Reutilizar ClubMembership si el usuario perteneció anteriormente al club
        let membership = await tx.clubMembership.findUnique({
          where: {
            userId_clubId: {
              userId: updatedApp.userId,
              clubId,
            },
          },
        });

        // No preparar otra alta mientras exista una suscripción activa y vigente o en periodo de gracia
        if (membership) {
          const activeSubscription =
            await tx.subscription.findFirst({
              where: {
                clubMembershipId: membership.id,
                status: "ACTIVE",
                startedAt: { lte: now },
                expiresAt: { gt: now },
              },
              select: { id: true },
            });

          if (activeSubscription) {
            throw new Error("ACTIVE_SUBSCRIPTION_EXISTS");
          }

          const pendingGrace = await tx.subscription.findFirst({
            where: {
              clubMembershipId: membership.id,
              status: "PENDING_PAYMENT",
              gracePeriodEndsAt: {
                gt: now,
              },
            },
            select: {
              id: true,
            },
          });

          if (pendingGrace) {
            throw new Error("PENDING_GRACE_EXISTS");
          }
        }

        const previousStatus=membership?.status ?? null;
        if (!membership) {
          membership = await tx.clubMembership.create({
            data: {
              userId: updatedApp.userId,
              clubId,
              role: "MEMBER",
              // FREE se activa enseguida; PAID permanece suspendida hasta pagar
              status:
                updatedApp.plan.type === "FREE"
                  ? "ACTIVE"
                  : "SUSPENDED",
            },
          });
        }

        if (updatedApp.plan.type === "FREE") {
          const startedAt = now;

          const expiresAt = calculateExpirationDate(
            startedAt,
            updatedApp.plan.durationValue,
            updatedApp.plan.durationUnit
          );

          const subscription = await tx.subscription.create({
            data: {
              clubMembershipId: membership.id,
              planId: updatedApp.planId,
              status: "ACTIVE",
              firstActivatedAt: startedAt, billingMode: updatedApp.plan.billingMode,
              startedAt,
              expiresAt,
              gracePeriodEndsAt: null,
            },
          });

          await tx.clubMembership.update({
            where: { id: membership.id },
            data: { status: "ACTIVE" },
          });

          await tx.membershipEvent.create({data:{clubMembershipId:membership.id,type:previousStatus?"REACTIVATED":"JOINED",previousStatus,newStatus:"ACTIVE",newRole:membership.role,eventKey:"application:"+applicationId,actorId:user.id}});
          subscriptionId = subscription.id;
        }

        if (updatedApp.plan.type === "PAID") {
          // Solo reutilizar un alta inicial pendiente
          let subscription = await tx.subscription.findFirst({
            where: {
              clubMembershipId: membership.id,
              planId: updatedApp.planId,
              status: "PENDING_PAYMENT",
              startedAt: null,
              stripeSubscriptionId: null,
              gracePeriodEndsAt: null,
            },
            orderBy: { createdAt: "desc" },
          });

          if (!subscription) {
            subscription = await tx.subscription.create({
              data: {
                clubMembershipId: membership.id,
                planId: updatedApp.planId,
                billingMode: updatedApp.plan.billingMode, priceSnapshot: updatedApp.plan.price, durationValueSnapshot: updatedApp.plan.durationValue, durationUnitSnapshot: updatedApp.plan.durationUnit, planNameSnapshot: updatedApp.plan.name, currencySnapshot: "usd",
                status: "PENDING_PAYMENT",
                startedAt: null,
                expiresAt: null,
                gracePeriodEndsAt: null,
              },
            });
          }

          // La aprobación no activa una membresía pagada.
          // El webhook la activará cuando Stripe confirme el pago.
          await tx.clubMembership.updateMany({
            where: {
              id: membership.id,
              role:"MEMBER",status:{in:["ACTIVE","FINISHED","REMOVED"]},
            },
            data: {
              removedAt:null,finishedAt:null,status: "SUSPENDED",
            },
          });

          subscriptionId = subscription.id;
        }
      }

      await tx.notification.create({data: { recipientId: updatedApp.userId, clubId, type: status === "APPROVED" ? "APPLICATION_APPROVED" : "APPLICATION_REJECTED", eventKey: "review:"+applicationId, title: status === "APPROVED" ? "Solicitud aprobada" : "Solicitud rechazada", targetPath: "/app?view=applications", entityType: "application", entityId: applicationId }});
      await tx.notification.updateMany({where:{clubId,entityId:applicationId,type:"APPLICATION_SUBMITTED"},data:{resolvedAt:new Date()}});
      return {
        application: updatedApp,
        subscriptionId,
      };
    });

    return NextResponse.json({
      success: true,
      message:
        status === "REJECTED"
          ? "Solicitud rechazada correctamente"
          : result.application.plan.type === "FREE"
            ? "Solicitud aprobada y membresía gratuita activada"
            : "Solicitud aprobada. El usuario puede iniciar el pago",
      application: result.application,
      subscriptionId: result.subscriptionId,
      paymentRequired:
        status === "APPROVED" &&
        result.application.plan.type === "PAID",
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

      if (error.message === "APPLICATION_ALREADY_REVIEWED") {
        return NextResponse.json(
          {
            success: false,
            message: "La solicitud ya fue revisada",
          },
          { status: 409 }
        );
      }

      if (error.message === "ACTIVE_SUBSCRIPTION_EXISTS") {
        return NextResponse.json(
          {
            success: false,
            message:
              "El usuario ya tiene una suscripción vigente en este club",
          },
          { status: 409 }
        );
      }

      if (error.message === "PENDING_GRACE_EXISTS") {
        return NextResponse.json(
          {
            success: false,
            message:
              "El usuario tiene una renovación pendiente dentro de su periodo de gracia",
          },
          { status: 409 }
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