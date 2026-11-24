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
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

// Refactorización Parte 11: regresión HTTP sobre las fixtures de test:migration.
// Solo debe ejecutarse contra la instancia local de pruebas, nunca sobre producción.
const base = process.env.TEST_BASE_URL;
const url = process.env.TEST_DATABASE_URL;
if (!base || !url || !process.env.JWT_SECRET || !process.env.STRIPE_WEBHOOK_SECRET) throw new Error("Se requieren TEST_BASE_URL, TEST_DATABASE_URL, JWT_SECRET y STRIPE_WEBHOOK_SECRET del entorno de pruebas.");
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("La prueba HTTP solo admite una instancia local.");
const db = new PrismaClient({ datasources: { db: { url } } });
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const entityId = id(1), adminId = id(3), memberId = id(4), outsiderId = id(5);
const token = userId => jwt.sign({ userId, email: "fixture@example.test", globalRole: "USER" }, process.env.JWT_SECRET, { expiresIn: "10m" });
let checks = 0;
async function request(path, status = 200, userId, method = "GET", body, headers = {}) {
  const response = await fetch(new URL(path, base), {
    method, redirect: "manual", headers: { ...(userId ? { cookie: `auth_token=${token(userId)}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers }, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const text = await response.text();
  assert.equal(response.status, status, `${method} ${path}: ${text.slice(0, 350)}`);
  checks++;
  return { response, text, data: response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : null };
}
try {
  for (const path of ["/", "/login", "/register", "/entities", `/entity/${entityId}`]) {
    const { text } = await request(path);
    assert.match(text, /Klan/);
  }
  await request("/brand/klan-icon.png");
  await request("/api/test-db", 404);
  const bubbles = (await request("/api/catalog/bubbles")).data;
  assert.ok(bubbles.entities.some(e => e.id === entityId));
  const catalog = (await request(`/api/catalog/entities/${entityId}`)).data;
  assert.equal(catalog.entity.id, entityId);
  assert.equal(catalog.entity.bankDetails, undefined);
  assert.equal(catalog.entity.memberships, undefined);
  assert.ok((await request("/api/search/entities?q=Academia")).data.entities.some(e => e.id === entityId));
  await request("/api/entities", 401);
  assert.ok((await request("/api/entities", 200, adminId)).data.entities.some(e => e.id === entityId && e.role === "ENTITY_ADMIN"));
  await request(`/api/entities/${entityId}/bank`, 403, outsiderId);
  await request(`/api/entities/${entityId}/members/${id(7)}`, 401, undefined, "DELETE");
  await request(`/api/entities/${entityId}/members/${id(7)}`, 403, outsiderId, "DELETE");
  const planCount = await db.membershipPlan.count();
  for (const invalid of ["{", "null", "[]", "{}", '{"name":"Mensual"}']) await request(`/api/entities/${entityId}/membership-plans`, 400, adminId, "POST", invalid);
  assert.equal(await db.membershipPlan.count(), planCount);
  await request(`/api/entities/${entityId}/membership-plans`, 403, outsiderId, "POST", { name: "Mensual", price: 5, type: "PAID", durationValue: 1, durationUnit: "MONTH" });
  const created = (await request("/api/entities", 201, adminId, "POST", { name: "Colectivo de prueba", slug: "test-" + randomUUID() })).data.entity;
  assert.equal(created.memberships[0].role, "ENTITY_ADMIN");
  assert.equal(created.memberships[0].entityId, created.id);
  const notifications = (await request(`/api/me/notifications?entityId=${entityId}`, 200, memberId)).data;
  assert.ok(notifications.notifications.length > 0);
  assert.ok(notifications.notifications.every(n => n.entityId === entityId && n.targetId === id(7)));
  assert.ok(notifications.byEntity.every(n => n.entityId === entityId));
  await request("/api/me/notifications", 200, memberId, "PATCH", { entityId, tab: "reservations" });
  const guest = await request(`/app?view=entity&entity=${entityId}`, 307);
  assert.equal(guest.response.headers.get("location"), `/entity/${entityId}`);
  // Pago único real contra PostgreSQL: Stripe se simula mediante su firma oficial.
  const pass = await db.subscription.create({ data: { entityMembershipId: id(7), planId: id(9), status: "PENDING_PAYMENT", billingMode: "ONE_TIME", durationValueSnapshot: 1, durationUnitSnapshot: "DAY", priceSnapshot: 10 } });
  const obligation = await db.paymentObligation.create({ data: { entityId, userId: memberId, subscriptionId: pass.id, obligationKey: "initial:" + pass.id, amount: 10 } });
  const sessionId = "cs_test_" + randomUUID();
  const payment = await db.payment.create({ data: { entityId, userId: memberId, subscriptionId: pass.id, obligationId: obligation.id, amount: 10, stripeCheckoutSessionId: sessionId } });
  const eventId = "evt_test_" + randomUUID();
  const createdAt = Math.floor(Date.now() / 1000) - 2 * 86400;
  const stripe = new Stripe("sk_test_validation_only");
  // Simula una sesión emitida antes de la migración: sus IDs estables siguen resolviendo el pago.
  const payload = JSON.stringify({ id: eventId, object: "event", created: createdAt, type: "checkout.session.completed", data: { object: { id: sessionId, object: "checkout.session", mode: "payment", payment_status: "paid", currency: "usd", amount_total: 1000, payment_intent: "pi_" + randomUUID(), metadata: { paymentId: payment.id, subscriptionId: pass.id, clubId: entityId } } } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const deliver = () => request("/api/webhooks/stripe", 200, undefined, "POST", payload, { "stripe-signature": signature });
  await deliver();
  const activated = await db.subscription.findUniqueOrThrow({ where: { id: pass.id } });
  assert.equal(+activated.expiresAt, createdAt * 1000 + 86400000);
  assert.equal(activated.gracePeriodEndsAt, null);
  assert.equal((await deliver()).data.duplicate, true);
  assert.deepEqual(await db.subscription.findUniqueOrThrow({ where: { id: pass.id } }), activated);
  await request("/api/webhooks/stripe", 400, undefined, "POST", payload, { "stripe-signature": "invalida" });
  if (!process.env.CRON_SECRET) throw new Error("CRON_SECRET debe corresponder a la instancia de prueba.");
  await request("/api/cron/expired-plans", 200, undefined, "POST", undefined, { authorization: "Bearer " + process.env.CRON_SECRET });
  const expired = await db.subscription.findUniqueOrThrow({ where: { id: pass.id } });
  assert.equal(expired.status, "FINISHED");
  assert.equal(expired.gracePeriodEndsAt, null);
  assert.equal((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status, "PAID");
  assert.equal(await db.membershipEvent.count({ where: { eventKey: "activation:" + pass.id } }), 1);
  console.log(JSON.stringify({ result: "PASS", httpRequests: checks, checks: ["rutas públicas y marca", "contratos Entity", "aislamiento entre entidades", "HTTP 400/401/403", "diagnóstico 404", "creación y rol ENTITY_ADMIN", "notificaciones sin colisión", "redirección privada", "webhook firmado con metadatos previos", "idempotencia", "pase de un día sin gracia"] }, null, 2));
} finally { await db.$disconnect(); }
