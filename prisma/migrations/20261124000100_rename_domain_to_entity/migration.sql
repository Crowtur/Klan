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

-- Parte 11: renombrado físico del dominio, sin recrear tablas ni borrar registros.
-- Las migraciones previas se conservan exactamente para respetar sus checksums.
-- Detener las escrituras de la versión anterior antes de aplicar este contrato.
BEGIN;

-- Roles: el cambio de etiqueta conserva los valores de membresías y eventos.
ALTER TYPE "ClubRole" RENAME TO "EntityRole";
ALTER TYPE "EntityRole" RENAME VALUE 'CLUB_ADMIN' TO 'ENTITY_ADMIN';
ALTER TYPE "ClubStatus" RENAME TO "EntityStatus";

-- Tablas con identidad de negocio; se conservan sus claves y referencias.
ALTER TABLE "Club" RENAME TO "Entity";
ALTER TABLE "ClubMembership" RENAME TO "EntityMembership";
ALTER TABLE "ClubSettlement" RENAME TO "EntitySettlement";
ALTER TABLE "ClubBankDetails" RENAME TO "EntityBankDetails";

-- El recurso de una notificación se distingue de la entidad a la que pertenece.
ALTER TABLE "Notification" RENAME COLUMN "entityType" TO "targetType";
ALTER TABLE "Notification" RENAME COLUMN "entityId" TO "targetId";

-- Columnas de tenant y membresía. PostgreSQL conserva las relaciones existentes.
ALTER TABLE "EntityMembership" RENAME COLUMN "clubId" TO "entityId";
ALTER TABLE "MembershipPlan" RENAME COLUMN "clubId" TO "entityId";
ALTER TABLE "Subscription" RENAME COLUMN "clubMembershipId" TO "entityMembershipId";
ALTER TABLE "Payment" RENAME COLUMN "clubId" TO "entityId";
ALTER TABLE "EntitySettlement" RENAME COLUMN "clubId" TO "entityId";
ALTER TABLE "Facility" RENAME COLUMN "clubId" TO "entityId";
ALTER TABLE "Reservation" RENAME COLUMN "clubMembershipId" TO "entityMembershipId";
ALTER TABLE "Post" RENAME COLUMN "clubId" TO "entityId";
ALTER TABLE "MembershipEvent" RENAME COLUMN "clubMembershipId" TO "entityMembershipId";
ALTER TABLE "PaymentObligation" RENAME COLUMN "clubId" TO "entityId";
ALTER TABLE "Notification" RENAME COLUMN "clubId" TO "entityId";
ALTER TABLE "EntityBankDetails" RENAME COLUMN "clubId" TO "entityId";

-- Nombres de claves primarias y foráneas según el esquema Prisma final.
ALTER TABLE "Entity" RENAME CONSTRAINT "Club_pkey" TO "Entity_pkey";
ALTER TABLE "EntityMembership" RENAME CONSTRAINT "ClubMembership_pkey" TO "EntityMembership_pkey";
ALTER TABLE "EntitySettlement" RENAME CONSTRAINT "ClubSettlement_pkey" TO "EntitySettlement_pkey";
ALTER TABLE "EntityBankDetails" RENAME CONSTRAINT "ClubBankDetails_pkey" TO "EntityBankDetails_pkey";
ALTER TABLE "EntityMembership" RENAME CONSTRAINT "ClubMembership_userId_fkey" TO "EntityMembership_userId_fkey";
ALTER TABLE "EntityMembership" RENAME CONSTRAINT "ClubMembership_clubId_fkey" TO "EntityMembership_entityId_fkey";
ALTER TABLE "MembershipPlan" RENAME CONSTRAINT "MembershipPlan_clubId_fkey" TO "MembershipPlan_entityId_fkey";
ALTER TABLE "Subscription" RENAME CONSTRAINT "Subscription_clubMembershipId_fkey" TO "Subscription_entityMembershipId_fkey";
ALTER TABLE "Payment" RENAME CONSTRAINT "Payment_clubId_fkey" TO "Payment_entityId_fkey";
ALTER TABLE "EntitySettlement" RENAME CONSTRAINT "ClubSettlement_clubId_fkey" TO "EntitySettlement_entityId_fkey";
ALTER TABLE "Facility" RENAME CONSTRAINT "Facility_clubId_fkey" TO "Facility_entityId_fkey";
ALTER TABLE "Reservation" RENAME CONSTRAINT "Reservation_clubMembershipId_fkey" TO "Reservation_entityMembershipId_fkey";
ALTER TABLE "Post" RENAME CONSTRAINT "Post_clubId_fkey" TO "Post_entityId_fkey";
ALTER TABLE "MembershipEvent" RENAME CONSTRAINT "MembershipEvent_clubMembershipId_fkey" TO "MembershipEvent_entityMembershipId_fkey";
ALTER TABLE "PaymentObligation" RENAME CONSTRAINT "PaymentObligation_clubId_fkey" TO "PaymentObligation_entityId_fkey";
ALTER TABLE "Notification" RENAME CONSTRAINT "Notification_clubId_fkey" TO "Notification_entityId_fkey";
ALTER TABLE "EntityBankDetails" RENAME CONSTRAINT "ClubBankDetails_clubId_fkey" TO "EntityBankDetails_entityId_fkey";

-- Índices, incluidas las restricciones únicas compuestas.
ALTER INDEX "Club_slug_key" RENAME TO "Entity_slug_key";
ALTER INDEX "ClubMembership_userId_idx" RENAME TO "EntityMembership_userId_idx";
ALTER INDEX "ClubMembership_clubId_idx" RENAME TO "EntityMembership_entityId_idx";
ALTER INDEX "ClubMembership_clubId_status_idx" RENAME TO "EntityMembership_entityId_status_idx";
ALTER INDEX "ClubMembership_userId_clubId_key" RENAME TO "EntityMembership_userId_entityId_key";
ALTER INDEX "MembershipPlan_clubId_idx" RENAME TO "MembershipPlan_entityId_idx";
ALTER INDEX "MembershipPlan_clubId_isActive_idx" RENAME TO "MembershipPlan_entityId_isActive_idx";
ALTER INDEX "Subscription_clubMembershipId_idx" RENAME TO "Subscription_entityMembershipId_idx";
ALTER INDEX "Payment_clubId_idx" RENAME TO "Payment_entityId_idx";
ALTER INDEX "Payment_clubId_status_paidAt_idx" RENAME TO "Payment_entityId_status_paidAt_idx";
ALTER INDEX "ClubSettlement_clubId_idx" RENAME TO "EntitySettlement_entityId_idx";
ALTER INDEX "ClubSettlement_status_idx" RENAME TO "EntitySettlement_status_idx";
ALTER INDEX "ClubSettlement_year_month_idx" RENAME TO "EntitySettlement_year_month_idx";
ALTER INDEX "ClubSettlement_clubId_year_month_key" RENAME TO "EntitySettlement_entityId_year_month_key";
ALTER INDEX "Facility_clubId_idx" RENAME TO "Facility_entityId_idx";
ALTER INDEX "Reservation_clubMembershipId_startAt_idx" RENAME TO "Reservation_entityMembershipId_startAt_idx";
ALTER INDEX "Post_clubId_createdAt_idx" RENAME TO "Post_entityId_createdAt_idx";
ALTER INDEX "MembershipEvent_clubMembershipId_occurredAt_idx" RENAME TO "MembershipEvent_entityMembershipId_occurredAt_idx";
ALTER INDEX "PaymentObligation_clubId_status_dueAt_idx" RENAME TO "PaymentObligation_entityId_status_dueAt_idx";
ALTER INDEX "Notification_recipientId_clubId_resolvedAt_idx" RENAME TO "Notification_recipientId_entityId_resolvedAt_idx";
ALTER INDEX "Notification_entityType_entityId_idx" RENAME TO "Notification_targetType_targetId_idx";

-- Actualizar únicamente destinos internos generados por la aplicación.
UPDATE "Notification" SET "targetPath" = regexp_replace("targetPath", '([?&])view=club(&|$)', '\1view=entity\2', 'g') WHERE "targetPath" LIKE '/app?%';
UPDATE "Notification" SET "targetPath" = regexp_replace("targetPath", '([?&])view=clubs(&|$)', '\1view=entities\2', 'g') WHERE "targetPath" LIKE '/app?%';
UPDATE "Notification" SET "targetPath" = regexp_replace("targetPath", '([?&])view=publicClub(&|$)', '\1view=publicEntity\2', 'g') WHERE "targetPath" LIKE '/app?%';
UPDATE "Notification" SET "targetPath" = regexp_replace("targetPath", '([?&])view=globalClubs(&|$)', '\1view=globalEntities\2', 'g') WHERE "targetPath" LIKE '/app?%';
UPDATE "Notification" SET "targetPath" = regexp_replace("targetPath", '([?&])club=', '\1entity=', 'g') WHERE "targetPath" LIKE '/app?%';
UPDATE "Notification" SET "targetPath" = regexp_replace("targetPath", '^/explore/', '/entity/') WHERE "targetPath" LIKE '/explore/%';
UPDATE "Notification" SET "targetPath" = regexp_replace("targetPath", '^/explore([?]|$)', '/entities\1') WHERE "targetPath" = '/explore' OR "targetPath" LIKE '/explore?%';

-- Texto del sistema: no modificar nombres ni contenido escrito por los usuarios.
UPDATE "Notification" SET "title" = 'Retiro de la entidad' WHERE "title" = 'Retiro del club' AND "type" IN ('MEMBER_LEFT', 'MEMBER_REMOVED');

COMMIT;
