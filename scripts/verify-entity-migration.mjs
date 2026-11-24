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

import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, cp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

// Refactorización Parte 11: prueba de integración con PostgreSQL real y una base vacía.
// Los nombres antiguos aparecen únicamente para reproducir datos de la Parte 10.4.
// Nunca usa DATABASE_URL como alternativa ni borra datos o esquemas existentes.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Define TEST_DATABASE_URL con una base PostgreSQL vacía y exclusiva para esta prueba.");
const fresh = process.env.TEST_MIGRATION_MODE === "fresh";
const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
const db = new PrismaClient({ datasources: { db: { url } } });
const migration = "20261124000100_rename_domain_to_entity";
const schema = join(root, "prisma/schema.prisma");
const temporary = await mkdtemp(join(tmpdir(), "klan-part11-"));

function prisma(args) {
  const result = spawnSync(process.execPath, [join(root, "node_modules/prisma/build/index.js"), ...args], {
    cwd: root, env, encoding: "utf8", timeout: 120000,
  });
  if (result.status !== 0) throw new Error(`Prisma ${args[0]} ${args[1]} falló:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const renamed = name => name.replaceAll("Club", "Entity").replaceAll("club", "entity");
const ids = Object.fromEntries(["entity", "second", "admin", "member", "outsider", "adminMembership", "membership", "otherMembership", "plan", "subscription", "facility", "reservation", "payment", "obligation", "post", "settlement", "event"].map((name, i) => [name, `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`]));
const at = "2026-11-24T12:00:00.000Z";
async function insert(table, values) {
  const columns = await db.$queryRawUnsafe('SELECT column_name, udt_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1', table);
  const types = Object.fromEntries(columns.map(c => [c.column_name, c.udt_name]));
  const entries = Object.entries(values);
  return db.$executeRawUnsafe(`INSERT INTO ${quote(table)} (${entries.map(([k]) => quote(k)).join(",")}) VALUES (${entries.map(([k], i) => `$${i + 1}::${quote(types[k])}`).join(",")})`, ...entries.map(([, v]) => v));
}
async function snapshot() {
  const tables = await db.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations' ORDER BY tablename");
  const result = {};
  for (const { tablename } of tables) result[tablename] = (await db.$queryRawUnsafe(`SELECT row_to_json(t) AS row FROM ${quote(tablename)} t`)).map(r => r.row);
  return result;
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}
const legacyPaths = [
  ["/app?view=club&club=" + ids.entity + "&tab=reservations", "/app?view=entity&entity=" + ids.entity + "&tab=reservations"],
  ["/app?club=" + ids.entity + "&view=publicClub", "/app?entity=" + ids.entity + "&view=publicEntity"],
  ["/app?view=clubs", "/app?view=entities"],
  ["/app?view=globalClubs", "/app?view=globalEntities"],
  ["/explore/" + ids.entity + "?post=" + ids.post, "/entity/" + ids.entity + "?post=" + ids.post],
  ["/explore?q=academia", "/entities?q=academia"],
  ["/app?view=memberships", "/app?view=memberships"],
];
async function fixtures() {
  for (const name of ["admin", "member", "outsider"]) await insert("User", { id: ids[name], firstName: name, lastName: "Prueba", email: `${name}@example.test`, passwordHash: "fixture-sin-acceso-por-contrasena", globalRole: "USER", status: "ACTIVE", updatedAt: at });
  for (const name of ["entity", "second"]) await insert("Club", { id: ids[name], name: name === "entity" ? "Academia Demo" : "Club Histórico", slug: name, description: "Contenido original del usuario: club de lectura", status: "ACTIVE", timeZone: "America/Guayaquil", updatedAt: at });
  for (const [name, user, tenant, role] of [["adminMembership", "admin", "entity", "CLUB_ADMIN"], ["membership", "member", "entity", "MEMBER"], ["otherMembership", "outsider", "second", "MEMBER"]]) await insert("ClubMembership", { id: ids[name], userId: ids[user], clubId: ids[tenant], role, status: "ACTIVE" });
  await insert("MembershipPlan", { id: ids.plan, clubId: ids.entity, name: "Plan original", price: "10.00", type: "PAID", billingMode: "RECURRING", durationValue: 1, durationUnit: "MONTH", benefits: '["Acceso"]', updatedAt: at });
  await insert("Subscription", { id: ids.subscription, clubMembershipId: ids.membership, planId: ids.plan, stripeSubscriptionId: "sub_existing", status: "ACTIVE", billingMode: "RECURRING", priceSnapshot: "10.00", firstActivatedAt: at, startedAt: at, expiresAt: "2030-12-24T12:00:00.000Z", nextBillingAt: "2030-12-24T12:00:00.000Z", updatedAt: at });
  await insert("PaymentObligation", { id: ids.obligation, clubId: ids.entity, userId: ids.member, subscriptionId: ids.subscription, obligationKey: "invoice:in_existing", stripeInvoiceId: "in_existing", amount: "10.00", status: "PAID", paidAt: at, updatedAt: at });
  await insert("Payment", { id: ids.payment, clubId: ids.entity, userId: ids.member, subscriptionId: ids.subscription, obligationId: ids.obligation, amount: "10.00", status: "PAID", stripeCheckoutSessionId: "cs_existing", stripePaymentIntentId: "pi_existing", stripeSubscriptionId: "sub_existing", stripeInvoiceId: "in_existing", paidAt: at, updatedAt: at });
  await insert("ClubSettlement", { id: ids.settlement, clubId: ids.entity, year: 2026, month: 11, grossAmount: "10.00", stripeFee: "0.50", transferFee: "0.00", platformFee: "1.00", totalFees: "1.50", netAmount: "8.50", status: "PAID", paidAt: at, updatedAt: at });
  await insert("ClubBankDetails", { clubId: ids.entity, beneficiary: "Titular de prueba", identity: "fixture", bankName: "Banco de prueba", accountType: "Ahorros", accountNumber: "0000000000" });
  await insert("Facility", { id: ids.facility, clubId: ids.entity, name: "Sala de pruebas", capacity: 10, status: "ACTIVE", updatedAt: at });
  await insert("FacilitySchedule", { id: "schedule-fixture", facilityId: ids.facility, dayOfWeek: "MONDAY", openingTime: "08:00", closingTime: "18:00", intervalOrder: 0, isClosed: false, updatedAt: at });
  await insert("FacilityPlanAccess", { id: "access-fixture", facilityId: ids.facility, membershipPlanId: ids.plan, maxReservationMinutesPerDay: 120, updatedAt: at });
  await insert("Reservation", { id: ids.reservation, facilityId: ids.facility, clubMembershipId: ids.membership, startAt: "2030-11-25T15:00:00.000Z", endAt: "2030-11-25T16:00:00.000Z", status: "CONFIRMED", updatedAt: at });
  await insert("Post", { id: ids.post, clubId: ids.entity, authorId: ids.admin, title: "Club de lectura", content: "Texto original que debe conservarse", updatedAt: at });
  await insert("MembershipEvent", { id: ids.event, clubMembershipId: ids.adminMembership, type: "ROLE_CHANGED", previousStatus: "ACTIVE", newStatus: "ACTIVE", previousRole: "MEMBER", newRole: "CLUB_ADMIN", eventKey: "role:original" });
  for (const [i, [targetPath]] of legacyPaths.entries()) await insert("Notification", { id: "notice-" + i, recipientId: ids.member, clubId: i === 6 ? null : ids.entity, type: "MEMBER_LEFT", eventKey: "notice:" + i, title: "Retiro del club", message: "Mensaje original: club de lectura", targetPath, entityType: "membership", entityId: ids.membership });
  await insert("StripeWebhookEvent", { id: "evt_existing", type: "invoice.paid", stripeCreatedAt: at, status: "PROCESSED", attempts: 1, processedAt: at, updatedAt: at });
}
try {
  const tables = await db.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname = current_schema()");
  assert.equal(tables.length, 0, "La base de prueba debe estar vacía; no se modificarán datos existentes.");
  let before;
  if (!fresh) {
    await cp(schema, join(temporary, "schema.prisma"));
    await mkdir(join(temporary, "migrations"));
    for (const entry of await readdir(join(root, "prisma/migrations"))) if (entry !== migration) await cp(join(root, "prisma/migrations", entry), join(temporary, "migrations", entry), { recursive: true });
    prisma(["migrate", "deploy", "--schema", join(temporary, "schema.prisma")]);
    await fixtures();
    before = await snapshot();
  }
  prisma(["migrate", "deploy", "--schema", schema]);
  const after = await snapshot();
  if (before) {
    const expected = {};
    for (const [table, rows] of Object.entries(before)) expected[renamed(table)] = rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => {
      const nextKey = table === "Notification" && key === "entityId" ? "targetId" : table === "Notification" && key === "entityType" ? "targetType" : renamed(key);
      if (["role", "previousRole", "newRole"].includes(key) && value === "CLUB_ADMIN") value = "ENTITY_ADMIN";
      if (table === "Notification" && key === "targetPath") value = legacyPaths.find(([old]) => old === value)[1];
      if (table === "Notification" && key === "title") value = "Retiro de la entidad";
      return [nextKey, value];
    })));
    assert.deepEqual(canonical(after), canonical(expected), "Todas las filas, importes, fechas e identificadores deben conservarse.");
    const payment = await db.payment.findUniqueOrThrow({ where: { id: ids.payment }, include: { entity: true, subscription: { include: { entityMembership: true } }, obligation: true } });
    assert.equal(payment.entity.id, ids.entity);
    assert.equal(payment.subscription.entityMembership.userId, ids.member);
    assert.equal(payment.obligation.obligationKey, "invoice:in_existing");
    assert.equal((await db.entityMembership.findUniqueOrThrow({ where: { userId_entityId: { userId: ids.admin, entityId: ids.entity } } })).role, "ENTITY_ADMIN");
    const notice = await db.notification.findUniqueOrThrow({ where: { id: "notice-0" } });
    assert.equal(notice.entityId, ids.entity);
    assert.equal(notice.targetId, ids.membership);
    await assert.rejects(() => db.entityMembership.create({ data: { userId: ids.member, entityId: ids.entity } }), e => e.code === "P2002");
    await assert.rejects(() => db.entityMembership.create({ data: { userId: ids.member, entityId: "entidad-inexistente" } }), e => e.code === "P2003");
    await assert.rejects(() => insert("Reservation", { id: "overlap", facilityId: ids.facility, entityMembershipId: ids.membership, startAt: "2030-11-25T15:30:00.000Z", endAt: "2030-11-25T16:30:00.000Z", updatedAt: at }), e => e.meta?.code === "23P01");
    assert.deepEqual(canonical(await snapshot()), canonical(after), "Los rechazos no deben alterar las filas.");
  }
  const names = await db.$queryRawUnsafe("SELECT tablename AS name FROM pg_tables WHERE schemaname = current_schema() UNION ALL SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() UNION ALL SELECT conname FROM pg_constraint WHERE connamespace = current_schema()::regnamespace UNION ALL SELECT typname FROM pg_type WHERE typnamespace = current_schema()::regnamespace");
  assert.deepEqual(names.filter(({ name }) => /club/i.test(name)), [], "No deben quedar tablas, índices, tipos ni restricciones del dominio anterior.");
  assert.match(prisma(["migrate", "deploy", "--schema", schema]), /No pending migrations/);
  prisma(["migrate", "diff", "--from-schema-datasource", schema, "--to-schema-datamodel", schema, "--exit-code"]);
  const migrations = await db.$queryRawUnsafe('SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL');
  console.log(JSON.stringify({ mode: fresh ? "fresh" : "upgrade", result: "PASS", migrations: migrations[0].count, tables: Object.keys(after).length, preservedRows: before ? Object.values(before).reduce((n, rows) => n + rows.length, 0) : 0, checks: ["schema sin diferencias", "historial aplicado", "repetición sin cambios", ...(before ? ["filas completas preservadas", "roles y eventos", "pagos y fechas", "notificaciones y destinos", "claves únicas y foráneas", "exclusión de reservas"] : [])] }, null, 2));
} finally {
  await db.$disconnect();
  await rm(temporary, { recursive: true, force: true });
}
