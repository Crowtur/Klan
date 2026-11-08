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

type AuthorizationErrorCode =
  | "USER_INACTIVE"
  | "CLUB_INACTIVE"
  | "FACILITY_NOT_FOUND"
  | "FACILITY_INACTIVE"
  | "CLUB_MEMBERSHIP_REQUIRED"
  | "ACTIVE_SUBSCRIPTION_REQUIRED"
  | "FACILITY_PLAN_ACCESS_REQUIRED";

export class ReservationAuthorizationError extends Error {
  code: AuthorizationErrorCode;

  constructor(code: AuthorizationErrorCode, message: string) {
    super(message);
    this.name = "ReservationAuthorizationError";
    this.code = code;
  }
}

/** Comprueba usuario, club, instalación, membresía y acceso por plan antes de conceder una reserva. */
export async function authorizeFacilityReservation(
  userId: string,
  clubId: string,
  facilityId: string
) {
  const now = new Date();

  const [user, club, facility] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    }),

    prisma.club.findUnique({
      where: { id: clubId },
      select: { status: true },
    }),

    prisma.facility.findFirst({
      where: {
        id: facilityId,
        clubId,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    }),
  ]);

  if (!user || user.status !== "ACTIVE") {
    throw new ReservationAuthorizationError(
      "USER_INACTIVE",
      "El usuario no está activo."
    );
  }

  if (!club || club.status !== "ACTIVE") {
    throw new ReservationAuthorizationError(
      "CLUB_INACTIVE",
      "El club no existe o no está activo."
    );
  }

  if (!facility) {
    throw new ReservationAuthorizationError(
      "FACILITY_NOT_FOUND",
      "La instalación no existe en este club."
    );
  }

  if (facility.status !== "ACTIVE") {
    throw new ReservationAuthorizationError(
      "FACILITY_INACTIVE",
      "La instalación no está disponible."
    );
  }

  const membership = await prisma.clubMembership.findUnique({
    where: {
      userId_clubId: {
        userId,
        clubId,
      },
    },
    include: {
      subscriptions: {
        where: {
          status: "ACTIVE",
          startedAt: { lte: now },
          expiresAt: { gt: now },
        },
        include: {
          plan: {
            include: {
              facilityAccesses: {
                where: { facilityId },
                select: {
                  maxReservationMinutesPerDay: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new ReservationAuthorizationError(
      "CLUB_MEMBERSHIP_REQUIRED",
      "Necesitas una membresía activa en este club para reservar."
    );
  }

  const validSubscriptions = membership.subscriptions.filter(
    (subscription) => subscription.plan.isActive
  );

  if (validSubscriptions.length === 0) {
    throw new ReservationAuthorizationError(
      "ACTIVE_SUBSCRIPTION_REQUIRED",
      "Necesitas una suscripción activa y vigente para reservar."
    );
  }

  const authorizedSubscription = validSubscriptions.find(
    (subscription) =>
      subscription.plan.facilityAccesses.length > 0
  );

  if (!authorizedSubscription) {
    throw new ReservationAuthorizationError(
      "FACILITY_PLAN_ACCESS_REQUIRED",
      "Tu plan no permite reservar esta instalación."
    );
  }

  const facilityAccess =
    authorizedSubscription.plan.facilityAccesses[0];

  return {
    authorized: true as const,
    facility: {
      id: facility.id,
      name: facility.name,
    },
    membershipId: membership.id,
    subscriptionId: authorizedSubscription.id,
    plan: {
      id: authorizedSubscription.plan.id,
      name: authorizedSubscription.plan.name,
    },
    maxReservationMinutesPerDay:
      facilityAccess.maxReservationMinutesPerDay,
    subscriptionExpiresAt: authorizedSubscription.expiresAt,
  };
}