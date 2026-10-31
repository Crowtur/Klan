// Run: node scripts/test-ui-contracts.cjs
// Focused tests for the two read endpoints added for frontend completion.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, prisma, requireAuth=async()=>({id:'owner'})) {
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const exports={}; const context={exports,Error,console,require:(name)=>{
  if(name==='@/lib/prisma')return {prisma};
  if(name==='@/lib/auth/auth')return {requireAuth};
  if(name==='next/server')return {NextResponse:{json:(body,options)=>({body,status:options?.status||200})}};
  throw Error('Unexpected import '+name);
 }};vm.runInNewContext(js,context);return exports;
}
const catalog='src/app/api/catalog/clubs/[clubId]/route.ts';
const applications='src/app/api/me/applications/route.ts';
test('public catalog limits club and plans to active records and public fields',async()=>{
 let clubQuery,planQuery;
 const route=load(catalog,{club:{findFirst:async q=>(clubQuery=q,{id:'club'})},membershipPlan:{findMany:async q=>(planQuery=q,[])}});
 const r=await route.GET({}, {params:Promise.resolve({clubId:'club'})});
 assert.equal(r.status,200);assert.equal(clubQuery.where.id,'club');assert.equal(clubQuery.where.status,'ACTIVE');
 assert.equal(planQuery.where.clubId,'club');assert.equal(planQuery.where.isActive,true);
 assert.equal(planQuery.select.documentRequirements.where.isActive,true);
 assert.equal(clubQuery.select.memberships,undefined);assert.equal(planQuery.select.subscriptions,undefined);
});
test('unavailable club returns 404 without exposing any plans',async()=>{
 const route=load(catalog,{club:{findFirst:async()=>null},membershipPlan:{findMany:async()=>{throw Error('must not query plans');}}});
 assert.equal((await route.GET({}, {params:Promise.resolve({clubId:'missing'})})).status,404);
});
test('personal applications always use authenticated user, not supplied userId',async()=>{
 let query;const route=load(applications,{membershipApplication:{findMany:async q=>(query=q,[])}});
 const r=await route.GET({url:'https://local/api/me/applications?userId=someone-else'});
 assert.equal(r.status,200);assert.equal(query.where.userId,'owner');
 assert.equal(query.select.documents.select.fileKey,undefined);
 assert.equal(query.select.plan.select.documentRequirements.where.isActive,true);
});
test('unauthenticated requests do not reach the application query',async()=>{
 let reached=false;const route=load(applications,{membershipApplication:{findMany:async()=>{reached=true;return [];}}},async()=>{throw Error('UNAUTHORIZED');});
 assert.equal((await route.GET({})).status,401);assert.equal(reached,false);
});
test('database errors return controlled errors without exception details',async()=>{
 const route=load(applications,{membershipApplication:{findMany:async()=>{throw Error('private database detail');}}});
 const r=await route.GET({});assert.equal(r.status,500);assert.ok(!JSON.stringify(r.body).includes('private database detail'));
});
