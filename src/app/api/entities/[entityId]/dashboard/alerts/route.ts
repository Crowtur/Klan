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


import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireEntityMembership } from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{
    entityId: string;
  }>;
};

const ENTITY_TIME_ZONE = "America/Guayaquil";

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Reúne avisos de la entidad, incluidos vencimientos y operaciones pendientes de atención. */
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Autenticación
    const user = await requireAuth(request);
    const { entityId } = await context.params;

    // 2. Autorización contextual
    const membership = await requireEntityMembership(
      user.id,
      entityId
    );

    if (membership.role !== "ENTITY_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere el rol ENTITY_ADMIN",
        },
        { status: 403 }
      );
    }

    // 3. Validar la entidad
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!entity) {
      return NextResponse.json(
        {
          success: false,
          message: "Entidad no encontrada o inactiva",
        },
        { status: 404 }
      );
    }

    // 4. Ventanas temporales
    const now = new Date();

    const next7Days = addDays(now, 7);
    const last30Days = addDays(now, -30);

    // 5. Consultas
    const [
      expiringSubscriptionsCount,
      expiringSubscriptions,
      gracePeriodCount,
      failedPaymentsCount,
      failedPayments,
      pendingApplicationsCount,
      pendingApplications,
      upcomingReservationsCount,
      upcomingReservations,
      recentMembers,
      recentPayments,
      recentReservations,
    ] = await prisma.$transaction([
      // Suscripciones próximas a vencer
      prisma.subscription.count({
        where: {
          status: "ACTIVE",
          startedAt: { lte: now },
          expiresAt: {
            gt: now,
            lte: next7Days,
          },
          entityMembership: {
            entityId,
            status: "ACTIVE",
          },
          plan: {
            entityId,
            isActive: true,
          },
        },
      }),

      prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          startedAt: { lte: now },
          expiresAt: {
            gt: now,
            lte: next7Days,
          },
          entityMembership: {
            entityId,
            status: "ACTIVE",
          },
          plan: {
            entityId,
            isActive: true,
          },
        },
        select: {
          id: true,
          expiresAt: true,
          plan: {
            select: {
              id: true,
              name: true,
            },
          },
          entityMembership: {
            select: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          expiresAt: "asc",
        },
        take: 10,
      }),

      // Períodos de gracia vigentes
      prisma.subscription.count({
        where: {
          status: {
            in: ["EXPIRED", "SUSPENDED"],
          },
          expiresAt: { lte: now },
          gracePeriodEndsAt: { gt: now },
          entityMembership: { entityId },
        },
      }),

      // Pagos fallidos de los últimos 30 días
      prisma.payment.count({
        where: {
          entityId,
          status: "FAILED",
          createdAt: { gte: last30Days },
        },
      }),

      prisma.payment.findMany({
        where: {
          entityId,
          status: "FAILED",
          createdAt: { gte: last30Days },
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),

      // Solicitudes pendientes de revisión
      prisma.membershipApplication.count({
        where: {
          status: {
            in: [
              "PENDING",
              "DOCUMENTATION_REVIEW",
            ],
          },
          plan: { entityId },
        },
      }),

      prisma.membershipApplication.findMany({
        where: {
          status: {
            in: [
              "PENDING",
              "DOCUMENTATION_REVIEW",
            ],
          },
          plan: { entityId },
        },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          plan: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          submittedAt: "asc",
        },
        take: 10,
      }),

      // Reservas confirmadas en los próximos 7 días
      prisma.reservation.count({
        where: {
          status: "CONFIRMED",
          startAt: {
            gte: now,
            lt: next7Days,
          },
          facility: { entityId },
        },
      }),

      prisma.reservation.findMany({
        where: {
          status: "CONFIRMED",
          startAt: {
            gte: now,
            lt: next7Days,
          },
          facility: { entityId },
        },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          facility: {
            select: {
              id: true,
              name: true,
            },
          },
          entityMembership: {
            select: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          startAt: "asc",
        },
        take: 10,
      }),

      // Incorporaciones recientes
      prisma.entityMembership.findMany({
        where: {
          entityId,
          joinedAt: { gte: last30Days },
        },
        select: {
          id: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          joinedAt: "desc",
        },
        take: 10,
      }),

      // Pagos confirmados recientemente
      prisma.payment.findMany({
        where: {
          entityId,
          status: "PAID",
          paidAt: { gte: last30Days },
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          paidAt: true,
        },
        orderBy: {
          paidAt: "desc",
        },
        take: 10,
      }),

      // Reservas creadas recientemente
      prisma.reservation.findMany({
        where: {
          facility: { entityId },
          createdAt: { gte: last30Days },
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          facility: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
    ]);

    // 6. Construir las alertas
    const alerts = [
      {
        type: "SUBSCRIPTIONS_EXPIRING",
        severity: "WARNING",
        title: "Suscripciones próximas a vencer",
        count: expiringSubscriptionsCount,
        windowDays: 7,
        items: expiringSubscriptions,
      },
      {
        type: "SUBSCRIPTIONS_IN_GRACE",
        severity: "WARNING",
        title: "Suscripciones en período de gracia",
        count: gracePeriodCount,
        items: [],
      },
      {
        type: "FAILED_PAYMENTS",
        severity: "ERROR",
        title: "Pagos fallidos",
        count: failedPaymentsCount,
        windowDays: 30,
        items: failedPayments.map((payment) => ({
          ...payment,
          amount: payment.amount.toFixed(2),
        })),
      },
      {
        type: "PENDING_APPLICATIONS",
        severity: "INFO",
        title: "Solicitudes pendientes de revisión",
        count: pendingApplicationsCount,
        items: pendingApplications,
      },
      {
        type: "UPCOMING_RESERVATIONS",
        severity: "INFO",
        title: "Reservas próximas",
        count: upcomingReservationsCount,
        windowDays: 7,
        items: upcomingReservations,
      },
    ];

    // 7. Construir actividad reciente
    const recentActivity = [
      ...recentMembers.map((member) => ({
        type: "MEMBER_JOINED",
        id: member.id,
        occurredAt: member.joinedAt,
        description: "Nuevo miembro incorporado",
        user: member.user,
      })),

      ...recentPayments.map((payment) => ({
        type: "PAYMENT_CONFIRMED",
        id: payment.id,
        occurredAt: payment.paidAt,
        description: "Pago confirmado",
        amount: payment.amount.toFixed(2),
        currency: payment.currency,
      })),

      ...recentReservations.map((reservation) => ({
        type: "RESERVATION_CREATED",
        id: reservation.id,
        occurredAt: reservation.createdAt,
        description: "Reserva registrada",
        status: reservation.status,
        facility: reservation.facility,
      })),
    ]
      .filter((activity) => activity.occurredAt !== null)
      .sort(
        (a, b) =>
          new Date(b.occurredAt!).getTime() -
          new Date(a.occurredAt!).getTime()
      )
      .slice(0, 20);

    // 8. Respuesta
    return NextResponse.json({
      success: true,

      entity,

      generatedAt: now.toISOString(),
      timeZone: ENTITY_TIME_ZONE,

      summary: {
        expiringSubscriptions:
          expiringSubscriptionsCount,
        subscriptionsInGracePeriod:
          gracePeriodCount,
        failedPayments: failedPaymentsCount,
        pendingApplications:
          pendingApplicationsCount,
        upcomingReservations:
          upcomingReservationsCount,
      },

      alerts,
      recentActivity,
    });
  } catch (error) {
    console.error(
      "Entidad dashboard alerts error:",
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
            message: "Acceso denegado",
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
