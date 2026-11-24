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

// Refactorización Parte 11: permisos y claves compuestas del dominio Entity; se mantienen las comprobaciones de sesión y autorización.

import {activeMember} from "@/lib/entities/active";
import { prisma } from "@/lib/prisma";
import { EntityRole } from "@prisma/client";

/** Busca la relación mediante la clave compuesta de usuario y entidad. */
export async function getEntityMembership(
  userId: string,
  entityId: string
) {
  return prisma.entityMembership.findUnique({
    where: {
      userId_entityId: {
        userId,
        entityId,
      },
    },
    include: {
      entity: true,
    },
  });
}

/** Resuelve el acceso en la entidad solicitada y contempla al superadministrador sin crear una membresía. */
export async function requireEntityMembership(
  userId: string,
  entityId: string
) {
  const actor=await prisma.user.findUnique({where:{id:userId},select:{globalRole:true,status:true}});
  if(actor?.globalRole==="SUPER_ADMIN"&&actor.status==="ACTIVE"){
    const entity=await prisma.entity.findUnique({where:{id:entityId}});
    if(!entity)throw new Error("FORBIDDEN");
    const own=await getEntityMembership(userId,entityId);
    // Empty id explicitly represents an administrative context, never a stored membership.
    return {id:own?.status==="ACTIVE"?own.id:"",userId,entityId,role:EntityRole.ENTITY_ADMIN,status:"ACTIVE" as const,joinedAt:own?.joinedAt??entity.createdAt,removedAt:null,removedById:null,removalReason:null,entity};
  }
  const membership = await getEntityMembership(userId, entityId);

  if (!membership) {
    throw new Error("FORBIDDEN");
  }

  if (membership.status !== "ACTIVE") {
    throw new Error("FORBIDDEN");
  }

  if (membership.entity.status !== "ACTIVE") {
    throw new Error("FORBIDDEN");
  }

  if(membership.role==="MEMBER" && !await prisma.entityMembership.count({where:{id:membership.id,...activeMember()}})) throw new Error("FORBIDDEN");
  return membership;
}

/** Comprueba el rol administrativo dentro de la entidad antes de permitir cambios en sus recursos. */
export async function requireEntityAdmin(
  userId: string,
  entityId: string
) {
  const membership = await requireEntityMembership(
    userId,
    entityId
  );

  if (membership.role !== EntityRole.ENTITY_ADMIN) {
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

/** Distingue la autorización global de la que corresponde al administrador de la entidad concreto. */
export async function requireEntitySuspensionPermission(
  userId: string,
  entityId: string
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

  // Un SUPER_ADMIN puede suspender cualquier entidad.
  if (user.globalRole === "SUPER_ADMIN") {
    return;
  }

  // Un ENTITY_ADMIN solo puede suspender su propia entidad.
  const membership = await prisma.entityMembership.findUnique({
    where: {
      userId_entityId: {
        userId,
        entityId,
      },
    },
  });

  if (
    !membership ||
    membership.status !== "ACTIVE" ||
    membership.role !== "ENTITY_ADMIN"
  ) {
    throw new Error("FORBIDDEN");
  }
}