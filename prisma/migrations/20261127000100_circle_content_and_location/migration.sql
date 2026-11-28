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

-- Se amplía el dominio Entity de forma aditiva; no se eliminan datos ni columnas anteriores.
ALTER TABLE "Entity"
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "rulesDocumentUrl" TEXT,
  ADD COLUMN "rulesDocumentFileKey" TEXT,
  ADD COLUMN "rulesDocumentFileName" TEXT,
  ADD COLUMN "rulesDocumentVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_location_pair_check" CHECK (
  ("latitude" IS NULL AND "longitude" IS NULL) OR
  ("latitude" IS NOT NULL AND "longitude" IS NOT NULL AND "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)
);
CREATE TABLE "EntityRule" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EntityRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EntityRule_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EntityRule_order_check" CHECK ("sortOrder" BETWEEN 0 AND 9999)
);
CREATE INDEX "EntityRule_entityId_sortOrder_id_idx" ON "EntityRule"("entityId","sortOrder","id");
ALTER TABLE "Post" ADD COLUMN "hashtags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "Post_hashtags_idx" ON "Post" USING GIN ("hashtags");

-- La base deriva las etiquetas también para escrituras antiguas, importaciones y actualizaciones parciales.
-- Se eliminan primero las URL para que sus fragmentos no se interpreten como etiquetas.
CREATE FUNCTION klan_post_hashtags() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE plain TEXT;
BEGIN
  plain := regexp_replace(normalize(coalesce(NEW."title", '') || E'\n' || NEW."content", NFC), '(https?://|www\.)[^[:space:]<>"'']+', ' ', 'gi');
  NEW."hashtags" := ARRAY(
    SELECT DISTINCT lower(m[2]) FROM regexp_matches(plain, '(^|[^[:alnum:]_])#([[:alnum:]_]+)', 'g') AS m
    WHERE char_length(m[2]) <= 64 ORDER BY lower(m[2])
  );
  RETURN NEW;
END $$;
CREATE TRIGGER "Post_derive_hashtags" BEFORE INSERT OR UPDATE OF "title", "content", "hashtags" ON "Post" FOR EACH ROW EXECUTE FUNCTION klan_post_hashtags();
-- Conserva fechas e identificadores: sólo rellena el índice de búsqueda de publicaciones existentes.
UPDATE "Post" SET "hashtags" = ARRAY[]::TEXT[];

-- Compatibilidad: el booleano heredado refleja los requisitos activos y deja de ser una decisión editable.
CREATE FUNCTION klan_plan_documentation_flag() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."requiresDocumentation" := EXISTS (SELECT 1 FROM "PlanDocumentRequirement" WHERE "planId" = NEW."id" AND "isActive" = true);
  RETURN NEW;
END $$;
CREATE TRIGGER "MembershipPlan_derive_documentation" BEFORE INSERT OR UPDATE OF "requiresDocumentation" ON "MembershipPlan" FOR EACH ROW EXECUTE FUNCTION klan_plan_documentation_flag();
CREATE FUNCTION klan_refresh_plan_documentation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN UPDATE "MembershipPlan" SET "requiresDocumentation" = false WHERE "id" = OLD."planId"; END IF;
  IF TG_OP <> 'DELETE' THEN UPDATE "MembershipPlan" SET "requiresDocumentation" = false WHERE "id" = NEW."planId"; END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER "PlanDocumentRequirement_refresh_plan" AFTER INSERT OR UPDATE OR DELETE ON "PlanDocumentRequirement" FOR EACH ROW EXECUTE FUNCTION klan_refresh_plan_documentation();
UPDATE "MembershipPlan" SET "requiresDocumentation" = false;
