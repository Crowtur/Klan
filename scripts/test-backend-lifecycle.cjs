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

/* Ejercita el ciclo de membresías y obligaciones de pago con dependencias aisladas. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");

function webhook(event, tx) {
  const exports = {};
  const prisma = { $transaction: work => work(tx) };
  const modules = {
    "@/lib/prisma": { prisma },
    "@/lib/stripe": { stripe: { webhooks: { constructEvent: () => event } } },
    "next/server": { NextResponse: Response },
    "@prisma/client": {}
  };
  const source = fs.readFileSync("src/app/api/webhooks/stripe/route.ts", "utf8");
  const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
  vm.runInNewContext(compiled.outputText,{exports,require:key=>modules[key],console,process:{env:{STRIPE_WEBHOOK_SECRET:"fixture"}}});
  return exports.POST(new Request("http://localhost/webhook",{method:"POST",headers:{"stripe-signature":"fixture"},body:"fixture"}));
}

test("a processed event exits before touching a payment",async()=>{
  const tx = {$queryRaw:async()=>[],stripeWebhookEvent:{findUnique:async()=>({status:"PROCESSED"})}};
  const response=await webhook({id:"evt_repeat",type:"checkout.session.completed"},tx);
  assert.equal(response.status,200);
  assert.equal((await response.json()).duplicate,true);
});

test("confirmed one-time checkout uses the contracted day count",async()=>{
  let activation,settled=false,processed=false;
  const paidAt=1700000000;
  const tx={
    $queryRaw:async()=>[],
    stripeWebhookEvent:{findUnique:async()=>null,upsert:async()=>{processed=true;}},
    payment:{findUnique:async()=>({id:"p",amount:10,subscriptionId:"s",stripeCheckoutSessionId:"cs",obligationId:"o",subscription:{
      billingMode:"ONE_TIME",durationValueSnapshot:3,plan:{durationValue:99},clubMembershipId:"m",clubMembership:{status:"SUSPENDED",role:"MEMBER"}
    }}),updateMany:async()=>({count:1})},
    paymentObligation:{update:async()=>{settled=true;}},
    subscription:{updateMany:async q=>{activation=q.data;return {count:1};}},
    membershipEvent:{create:async()=>{}},clubMembership:{update:async()=>{}}
  };
  const session={id:"cs",currency:"usd",amount_total:1000,mode:"payment",payment_status:"paid",metadata:{paymentId:"p",subscriptionId:"s"}};
  const response=await webhook({id:"evt",created:paidAt,type:"checkout.session.completed",data:{object:session}},tx);
  assert.equal(response.status,200);
  assert.equal(activation.expiresAt.getTime(),paidAt*1000+3*86400000);
  assert.equal(activation.firstActivatedAt.getTime(),paidAt*1000);
  assert.equal(settled&&processed,true);
});

test("expired pass is FINISHED and another valid access protects the membership",async()=>{
  const exports={};
  let passStatus,memberWhere,events=0;
  const tx={subscription:{updateMany:async q=>{passStatus=q.data.status;return {count:1};}},
    clubMembership:{updateMany:async q=>{memberWhere=q.where;return {count:0};}},
    membershipEvent:{create:async()=>{events++;}}};
  const prisma={$transaction:fn=>fn(tx),subscription:{findMany:async q=>q.where.billingMode==="ONE_TIME"?[{id:"pass",clubMembershipId:"member",expiresAt:new Date(0)}]:[]}};
  const code=ts.transpileModule(fs.readFileSync("src/app/api/cron/expired-plans/route.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(code,{exports,console,process:{env:{CRON_SECRET:"fixture"}},require:k=>({"@/lib/document-cleanup":{retryDocumentCleanup:async()=>({removed:0,pending:0})},"@/lib/prisma":{prisma},"@/lib/stripe":{stripe:{}},"next/server":{NextResponse:Response}})[k]});
  const r=await exports.POST(new Request("http://localhost/cron",{method:"POST",headers:{authorization:"Bearer fixture"}}));
  assert.equal(r.status,200);
  assert.equal(passStatus,"FINISHED");
  assert.equal(memberWhere.role,"MEMBER");
  assert.equal(memberWhere.subscriptions.none.OR[0].status,"ACTIVE");
  assert.equal(events,0);
});
