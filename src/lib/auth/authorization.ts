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

import {activeMember} from "@/lib/clubs/active";
import { prisma } from "@/lib/prisma";
import { ClubRole } from "@prisma/client";

/** Busca la relación mediante la clave compuesta de usuario y club. */
export async function getClubMembership(
  userId: string,
  clubId: string
) {
  return prisma.clubMembership.findUnique({
    where: {
      userId_clubId: {
        userId,
        clubId,
      },
    },
    include: {
      club: true,
    },
  });
}

/** Resuelve el acceso en el club solicitado y contempla al superadministrador sin crear una membresía. */
export async function requireClubMembership(
  userId: string,
  clubId: string
) {
  const actor=await prisma.user.findUnique({where:{id:userId},select:{globalRole:true,status:true}});
  if(actor?.globalRole==="SUPER_ADMIN"&&actor.status==="ACTIVE"){
    const club=await prisma.club.findUnique({where:{id:clubId}});
    if(!club)throw new Error("FORBIDDEN");
    const own=await getClubMembership(userId,clubId);
    // Empty id explicitly represents an administrative context, never a stored membership.
    return {id:own?.status==="ACTIVE"?own.id:"",userId,clubId,role:ClubRole.CLUB_ADMIN,status:"ACTIVE" as const,joinedAt:own?.joinedAt??club.createdAt,removedAt:null,removedById:null,removalReason:null,club};
  }
  const membership = await getClubMembership(userId, clubId);

  if (!membership) {
    throw new Error("FORBIDDEN");
  }

  if (membership.status !== "ACTIVE") {
    throw new Error("FORBIDDEN");
  }

  if (membership.club.status !== "ACTIVE") {
    throw new Error("FORBIDDEN");
  }

  if(membership.role==="MEMBER" && !await prisma.clubMembership.count({where:{id:membership.id,...activeMember()}})) throw new Error("FORBIDDEN");
  return membership;
}

/** Comprueba el rol administrativo dentro del club antes de permitir cambios en sus recursos. */
export async function requireClubAdmin(
  userId: string,
  clubId: string
) {
  const membership = await requireClubMembership(
    userId,
    clubId
  );

  if (membership.role !== ClubRole.CLUB_ADMIN) {
    throw new Error("FORBIDDEN");
  }

  return membership;
}

/** Consulta el rol global y el estado de la cuenta para autorizar operaciones de plataforma. */
export async function requireSuperAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("FORBIDDEN");
  }

  if (user.globalRole !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return user;
}

/** Distingue la autorización global de la que corresponde al administrador del club concreto. */
export async function requireClubSuspensionPermission(
  userId: string,
  clubId: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      globalRole: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new Error("FORBIDDEN");
  }

  // Un SUPER_ADMIN puede suspender cualquier club.
  if (user.globalRole === "SUPER_ADMIN") {
    return;
  }

  // Un CLUB_ADMIN solo puede suspender su propio club.
  const membership = await prisma.clubMembership.findUnique({
    where: {
      userId_clubId: {
        userId,
        clubId,
      },
    },
  });

  if (
    !membership ||
    membership.status !== "ACTIVE" ||
    membership.role !== "CLUB_ADMIN"
  ) {
    throw new Error("FORBIDDEN");
  }
}