// Run from project root: node scripts/test-feedback-part2.cjs
// Tests exercise handlers with isolated repositories; no external services are contacted.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports={},globals={}){const exports={};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;vm.runInNewContext(js,{...globals,exports,Date,URL,Response,Request,console,Error,require:n=>{if(n in imports)return imports[n];if(n==='next/server')return {NextResponse:{json:(body,o)=>({body,status:o?.status||200})}};if(n==='@prisma/client')return {ClubRole:{CLUB_ADMIN:'CLUB_ADMIN'}};throw Error('Unexpected import '+n)}});return exports;}
const routing=load('src/lib/notification-routing.ts');
test('recipient routing distinguishes administrative applications from personal applications',()=>{
 for(const type of ['APPLICATION_SUBMITTED','DOCUMENTS_SUBMITTED']){const r=routing.notificationDestination({type,clubId:'c1'});assert.equal(r.scope,'club');assert.equal(r.tab,'applications');assert.match(r.path,/tab=applications/)}
 for(const type of ['APPLICATION_APPROVED','APPLICATION_REJECTED','DOCUMENT_APPROVED','DOCUMENT_REJECTED'])assert.equal(routing.notificationDestination({type,clubId:'c1'}).scope,'personal');
 assert.equal(routing.notificationDestination({type:'SETTLEMENT_UPDATED',clubId:'c1'}).tab,'overview');
 assert.equal(routing.notificationTitle({type:'DOCUMENTS_SUBMITTED',title:'Documentación enviada'}),'Documentación recibida para revisión');
});
test('relative timestamps cover seconds, hours, days, weeks, months, years',()=>{const now=Date.parse('2026-11-04T12:00:00Z');for(const [seconds,text] of [[25,'25 segundos'],[3600,'1 hora'],[86400,'1 día'],[604800,'1 semana'],[2592000,'1 mes'],[31536000,'1 año']])assert.equal(routing.relativeTime(new Date(now-seconds*1000).toISOString(),now),'Hace '+text)});
function notificationRoute(prisma,user='u1'){return load('src/app/api/me/notifications/route.ts',{'@/lib/prisma':{prisma},'@/lib/auth/auth':{requireAuth:async()=>({id:user})}})}
test('reading a notification only mutates its authenticated recipient',async()=>{
 const records=[{id:'one',recipientId:'u1',readAt:null},{id:'two',recipientId:'u2',readAt:null}];const prisma={notification:{updateMany:async q=>{let count=0;for(const n of records)if(n.id===q.where.id&&n.recipientId===q.where.recipientId&&!n.readAt){n.readAt=q.data.readAt;count++}return {count}}}};
 let r=await notificationRoute(prisma).PATCH(new Request('https://local',{method:'PATCH',body:JSON.stringify({id:'two'})}));assert.equal((await r.json()).updated,0);
 r=await notificationRoute(prisma).PATCH(new Request('https://local',{method:'PATCH',body:JSON.stringify({id:'one'})}));assert.equal((await r.json()).updated,1);assert.equal(records[1].readAt,null);
});
test('unread counter does not discard resolved but unread notifications',async()=>{let grouped;const prisma={$transaction:async values=>Promise.all(values),notification:{findMany:async()=>[],count:async()=>0,groupBy:async q=>(grouped=q,[])}};await notificationRoute(prisma).GET(new Request('https://local/api/me/notifications?clubId=c1'));assert.equal(grouped.where.recipientId,'u1');assert.equal(grouped.where.clubId,'c1');assert.equal(grouped.where.readAt,null);assert.equal('resolvedAt' in grouped.where,false)});
function settlementRoute(status='PENDING',changed=1){let update,notifications;const row={id:'s1',clubId:'c1',status};const tx={clubSettlement:{updateMany:async q=>(update=q,{count:changed}),findUniqueOrThrow:async()=>({...row,status:'PAID'})},clubMembership:{findMany:async()=>[{userId:'admin1'},{userId:'admin2'}]},notification:{createMany:async q=>(notifications=q)}};const prisma={clubSettlement:{findUnique:async()=>row},$transaction:async fn=>fn(tx)};return {route:load('src/app/api/admin/settlements/[settlementId]/route.ts',{'@/lib/prisma':{prisma},'@/lib/auth/auth':{requireAuth:async()=>({id:'root',globalRole:'SUPER_ADMIN'})}}),inspect:()=>({update,notifications})}}
const settlementCtx={params:Promise.resolve({settlementId:'s1'})};
test('pending settlement can be paid directly; conditional transition prevents concurrent overwrite',async()=>{const {route,inspect}=settlementRoute();const r=await route.PATCH({json:async()=>({status:'PAID',paymentReference:'bank-123'})},settlementCtx);assert.equal(r.status,200);assert.equal(inspect().update.where.status,'PENDING');assert.equal(inspect().update.data.status,'PAID');assert.equal(inspect().notifications.data.length,2)});
test('settlement requires payment reference and reports concurrent changes',async()=>{assert.equal((await settlementRoute().route.PATCH({json:async()=>({status:'PAID',paymentReference:' '})},settlementCtx)).status,400);assert.equal((await settlementRoute('PENDING',0).route.PATCH({json:async()=>({status:'PAID',paymentReference:'ok'})},settlementCtx)).status,409);assert.equal((await settlementRoute('PAID').route.PATCH({json:async()=>({status:'PROCESSING'})},settlementCtx)).status,400)});
test('next charge falls back to expiry for legacy active recurring subscriptions only',async()=>{const base={status:'ACTIVE',billingMode:'RECURRING',nextBillingAt:null,expiresAt:'2026-12-04T00:00:00Z',plan:{type:'PAID'}};const rows=[{id:'recurring',...base},{id:'one-time',...base,billingMode:'ONE_TIME'},{id:'cancelled-renewal',...base,cancelAtPeriodEnd:true},{id:'free',...base,plan:{type:'FREE'}},{id:'finished',...base,status:'FINISHED'}];const route=load('src/app/api/me/subscriptions/route.ts',{'@/lib/prisma':{prisma:{subscription:{findMany:async()=>rows}}},'@/lib/auth/auth':{requireAuth:async()=>({id:'u1'})}});const r=await route.GET({});assert.equal(r.body.subscriptions.find(s=>s.id==='recurring').nextBillingAt,base.expiresAt);for(const s of r.body.subscriptions.filter(s=>s.id!=='recurring'))assert.equal(s.nextBillingAt,null)});
test('global administrative access does not create or borrow another user membership',async()=>{let creates=0;const prisma={user:{findUnique:async()=>({globalRole:'SUPER_ADMIN',status:'ACTIVE'})},club:{findUnique:async()=>({id:'c1',status:'ACTIVE',createdAt:new Date()})},clubMembership:{findUnique:async()=>null,create:async()=>creates++}};const auth=load('src/lib/auth/authorization.ts',{'@/lib/prisma':{prisma},'@/lib/clubs/active':{activeMember:()=>({})}});const scope=await auth.requireClubAdmin('root','c1');assert.equal(scope.id,'');assert.equal(scope.role,'CLUB_ADMIN');assert.equal(creates,0)});
test('ordinary member without membership cannot access club administration',async()=>{const prisma={user:{findUnique:async()=>({globalRole:'USER',status:'ACTIVE'})},clubMembership:{findUnique:async()=>null}};const auth=load('src/lib/auth/authorization.ts',{'@/lib/prisma':{prisma},'@/lib/clubs/active':{activeMember:()=>({})}});await assert.rejects(()=>auth.requireClubAdmin('user','c1'),/FORBIDDEN/)});
test('historical membership counts apply each member transition rather than summing event totals',()=>{const {activeMembershipsAt}=load('src/lib/membership-history.ts');const d=s=>new Date(s+'T00:00:00Z');const members=[{joinedAt:d('2026-01-01'),removedAt:null,status:'ACTIVE',events:[]},{joinedAt:d('2026-01-02'),removedAt:d('2026-01-05'),status:'REMOVED',events:[{occurredAt:d('2026-01-02'),previousStatus:null,newStatus:'ACTIVE'},{occurredAt:d('2026-01-05'),previousStatus:'ACTIVE',newStatus:'REMOVED'}]}];assert.equal(activeMembershipsAt(members,d('2026-01-04')),2);assert.equal(activeMembershipsAt(members,d('2026-01-06')),1)});
function uploadRouter(prisma,authUser={id:'admin',globalRole:'SUPER_ADMIN'},verify=async()=>{},deleted=[]){
 function f(){const chain={input:()=>chain,middleware:fn=>(chain.guard=fn,chain),onUploadComplete:fn=>({guard:chain.guard,complete:fn})};return chain}
 return load('src/app/api/uploadthing/core.ts',{'uploadthing/next':{createUploadthing:()=>f},'uploadthing/server':{UploadThingError:Error},zod:require('zod'),'@/lib/prisma':{prisma},'@/lib/auth/auth':{requireAuth:async()=>authUser},'@/lib/auth/authorization':{requireClubAdmin:verify},'@/lib/uploadthing-server':{deleteUploadThingFile:async key=>deleted.push(key)}}).ourFileRouter;
}
function uploadPrisma(){const stored=new Map();return {stored,club:{findUnique:async()=>({status:'ACTIVE'}),count:async()=>0},user:{count:async()=>0,findUnique:async()=>({globalRole:'SUPER_ADMIN',status:'ACTIVE'})},post:{count:async({where})=>[...stored.values()].filter(p=>p.imageFileKey===where.imageFileKey).length,upsert:async q=>{if(!stored.has(q.where.id))stored.set(q.where.id,q.create);return stored.get(q.where.id)},findFirst:async()=>null},membershipDocument:{count:async()=>0},membershipDocumentVersion:{count:async()=>0},clubSettlement:{count:async()=>0}}}
test('post upload commits text and image together and retry does not duplicate the post',async()=>{const prisma=uploadPrisma(),deleted=[],route=uploadRouter(prisma,undefined,undefined,deleted).postComposerUploader;const metadata={clubId:'club',userId:'admin',requestKey:'post-id',title:'Hola',content:'Contenido'};const file={key:'file1',ufsUrl:'https://files.test/file1',name:'test.png'};assert.equal((await route.complete({metadata,file})).persisted,true);assert.equal(prisma.stored.get('post-id').content,'Contenido');assert.equal(prisma.stored.get('post-id').imageUrl,file.ufsUrl);await route.complete({metadata,file:{...file,key:'file2'}});assert.equal(prisma.stored.size,1);assert.deepEqual(deleted,['file2'])});
test('post completion revalidates admin permission after an upload',async()=>{const prisma=uploadPrisma(),deleted=[];const route=uploadRouter(prisma,undefined,async()=>{throw Error('FORBIDDEN')},deleted).postComposerUploader;await assert.rejects(()=>route.complete({metadata:{clubId:'club',userId:'admin'},file:{key:'failed'}}));assert.equal(prisma.stored.size,0);assert.deepEqual(deleted,['failed'])});
test('receipt upload forbids regular users before any settlement write',async()=>{const route=uploadRouter(uploadPrisma(),{id:'user',globalRole:'USER'}).settlementReceiptUploader;await assert.rejects(()=>route.guard({req:{},input:{settlementId:'s'},files:[{}]}),/no autorizada/)});
test('receipt callback validates admin again and persists only server-issued file URL/key',async()=>{const prisma=uploadPrisma();let update;prisma.clubSettlement.findUniqueOrThrow=async()=>({id:'s',receiptFileKey:null});prisma.clubSettlement.updateMany=async q=>(update=q,{count:1});const route=uploadRouter(prisma).settlementReceiptUploader;const r=await route.complete({metadata:{settlementId:'s',userId:'admin'},file:{key:'receipt',ufsUrl:'https://files.test/receipt',name:'pago.pdf'}});assert.equal(r.persisted,true);assert.equal(update.where.receiptFileKey,null);assert.equal(update.data.receiptFileKey,'receipt');assert.equal(update.data.receiptFileName,'pago.pdf')});
test('membership history excludes unpaid or expired access but includes administrators',()=>{const {activeMembershipsAt}=load('src/lib/membership-history.ts');const d=s=>new Date(s+'T00:00:00Z');const base={joinedAt:d('2026-01-01'),status:'ACTIVE',removedAt:null,events:[]};const access={startedAt:d('2026-01-02'),firstActivatedAt:d('2026-01-02'),expiresAt:d('2026-01-05'),gracePeriodEndsAt:null,finishedAt:null};const members=[{...base,role:'CLUB_ADMIN',subscriptions:[]},{...base,role:'MEMBER',subscriptions:[]},{...base,role:'MEMBER',subscriptions:[access]}];assert.equal(activeMembershipsAt(members,d('2026-01-04')),2);assert.equal(activeMembershipsAt(members,d('2026-01-06')),1)});

test('reading a club tab scopes the update to its actor, club and event types', async () => {
  let update;
  const route = load('src/app/api/me/notifications/route.ts', {
    '@/lib/auth/auth': { requireAuth: async () => ({ id: 'member' }) },
    '@/lib/prisma': { prisma: { notification: { updateMany: async q => (update=q,{count:2}) } } }
  });
  const request = tab => ({ json: async () => ({ clubId:'club', tab, recipientId:'somebody-else' }) });
  assert.equal((await route.PATCH(request('reservations'))).status,200);
  assert.deepEqual(JSON.parse(JSON.stringify(update.where)), {
    recipientId:'member',clubId:'club',readAt:null,type:{in:['RESERVATION_CREATED','RESERVATION_CANCELLED']}
  });
  assert.equal((await route.PATCH(request('__proto__'))).status,400);
});

test('withdrawal persists the deletion key and reopens review only when no documents are pending', async () => {
  const calls=[];
  const tx={
    $queryRaw:async()=>{},
    membershipDocument:{
      findFirst:async q=>{assert.equal(q.where.application.userId,'member');return {id:'d',status:'PENDING',fileKey:'blob',version:2}},
      updateMany:async q=>{assert.equal(q.where.version,2);assert.equal(q.data.fileKey,null);return {count:1}}
    },
    pendingFileDeletion:{upsert:async q=>calls.push(q.create.fileKey)},
    membershipApplication:{updateMany:async q=>{assert.equal(q.where.documents.none.status,'PENDING');assert.equal(q.data.status,'PENDING')}}
  };
  const route=load('src/app/api/clubs/[clubId]/membership-applications/[applicationId]/documents/[documentId]/route.ts',{
    '@/lib/prisma':{prisma:{$transaction:fn=>fn(tx)}},
    '@/lib/auth/auth':{requireAuth:async()=>({id:'member'})},'@/lib/auth/authorization':{},
    '@/lib/document-cleanup':{removeQueuedFile:async key=>{calls.push(key);return false}}
  });
  const ctx={params:Promise.resolve({clubId:'c',applicationId:'a',documentId:'d'})};
  assert.equal((await route.DELETE(new Request('https://example.test/?version=1'),ctx)).status,409);
  const answer=await route.DELETE(new Request('https://example.test/?version=2'),ctx);
  assert.equal(answer.status,200);assert.deepEqual(calls,['blob','blob']);assert.match(answer.body.message,/reintento/);
});

test('cleanup retries failed files and acknowledges only successful storage deletes',async()=>{
  let down=true;const handled=[];
  const queue={findMany:async()=>[{fileKey:'blob'}],updateMany:async()=>handled.push('deferred'),deleteMany:async()=>handled.push('removed')};
  const cleanup=load('src/lib/document-cleanup.ts',{
    '@/lib/prisma':{prisma:{pendingFileDeletion:queue}},
    '@/lib/uploadthing-server':{deleteUploadThingFile:async()=>{if(down)throw Error('offline')}}
  });
  assert.equal((await cleanup.retryDocumentCleanup()).pending,1);
  down=false;assert.equal((await cleanup.retryDocumentCleanup()).removed,1);
  assert.deepEqual(handled,['deferred','removed']);
});

test('approving the last pending document after a rejection sends the application back to Documentos', async()=>{
  const applicationId='application';
  const doc={id:'d',version:2,status:'PENDING',application:{userId:'member',status:'DOCUMENTATION_REVIEW'}};
  let nextStatus;
  const tx={
    $queryRaw:async()=>{},
    membershipDocument:{updateMany:async()=>({count:1}),count:async q=>{
      assert.equal(q.where.status,'REJECTED');assert.equal(q.where.deletedAt,null);return 1;
    }},
    notification:{create:async()=>{}},
    membershipApplication:{updateMany:async q=>{
      assert.equal(q.where.documents.none.status,'PENDING');
      assert.equal(q.where.id,applicationId);nextStatus=q.data.status;
    }}
  };
  const prisma={$transaction:fn=>fn(tx),membershipDocument:{findFirst:async()=>doc,findUniqueOrThrow:async()=>doc}};
  const route=load('src/app/api/clubs/[clubId]/membership-applications/[applicationId]/documents/[documentId]/route.ts',{
    '@/lib/prisma':{prisma},'@/lib/auth/auth':{requireAuth:async()=>({id:'admin'})},
    '@/lib/auth/authorization':{requireClubAdmin:async()=>{}},'@/lib/document-cleanup':{}
  });
  const result=await route.PATCH({json:async()=>({status:'APPROVED',version:2})},{params:{clubId:'club',applicationId,documentId:'d'}});
  assert.equal(result.status,200);assert.equal(nextStatus,'PENDING');
});

test('los datos bancarios se escriben únicamente para el club autorizado y no se devuelven al remitente', async()=>{
  let allowed=false, stored;
  const bank=load('src/app/api/clubs/[clubId]/bank/route.ts',{
    zod:require('zod'),'@/lib/prisma':{prisma:{clubBankDetails:{upsert:async q=>{stored=q.create}}}},
    '@/lib/auth/auth':{requireAuth:async()=>({id:'actor'})},
    '@/lib/auth/authorization':{requireClubAdmin:async(id,club)=>{assert.equal(id,'actor');assert.equal(club,'club');if(!allowed)throw Error('FORBIDDEN')}}
  });
  const data={beneficiary:'Nombre',bankName:'Banco',accountType:'AHORROS',accountNumber:'000234',identity:'1234',clubId:'ajeno'};
  const request=()=>new Request('https://local.test',{method:'PUT',body:JSON.stringify(data)});
  const ctx={params:{clubId:'club'}};
  assert.equal((await bank.PUT(request(),ctx)).status,403);assert.equal(stored,undefined);
  allowed=true;const result=await bank.PUT(request(),ctx);assert.equal(result.status,200);
  assert.equal(stored.clubId,'club');assert.equal(stored.accountNumber,'000234');assert.doesNotMatch(await result.text(),/000234/);
  data.accountType='incorrecto';assert.equal((await bank.PUT(request(),ctx)).status,400);
});

test('un enlace público a una publicación anterior recupera su página dentro del club',async()=>{
  let skip;const prisma={club:{findUnique:async()=>({id:'club',status:'ACTIVE'})},post:{
    findFirst:async({where})=>{assert.equal(where.clubId,'club');assert.equal(where.id,'post');return {id:'post',updatedAt:new Date()}},
    count:async({where})=>where.OR?21:27,
    findMany:async q=>{skip=q.skip;return []}
  },$transaction:promises=>Promise.all(promises)};
  const route=load('src/app/api/clubs/[clubId]/posts/route.ts',{'@/lib/prisma':{prisma},'@/lib/auth/auth':{}});
  const result=await route.GET(new Request('https://local.test/?anchor=post&limit=10'),{params:{clubId:'club'}});
  assert.equal(result.status,200);assert.equal(result.body.pagination.page,3);assert.equal(skip,20);
});

test('la limpieza diaria requiere el secreto y conserva las notificaciones sin leer', async()=>{
  let remaining=[{readAt:null},{readAt:new Date()}];
  const route=load('src/app/api/cron/read-notifications/route.ts',{
    '@/lib/prisma':{prisma:{notification:{deleteMany:async({where})=>{
      assert.deepEqual(JSON.parse(JSON.stringify(where)),{readAt:{not:null}});
      const count=remaining.filter(n=>n.readAt!==null).length;
      remaining=remaining.filter(n=>n.readAt===null);return {count};
    }}}}
  },{process:{env:{CRON_SECRET:'test-key'}}});
  const request=key=>new Request('https://local.test/api/cron/read-notifications',{headers:{authorization:'Bearer '+key}});
  assert.equal((await route.GET(request('incorrect'))).status,401);
  assert.equal(remaining.length,2);
  assert.equal((await (await route.GET(request('test-key'))).json()).deleted,1);
  assert.equal(remaining[0].readAt,null);
  assert.equal((await (await route.GET(request('test-key'))).json()).deleted,0);
});

test('solo administradores autorizados pueden recuperar los últimos datos bancarios del club',async()=>{
  let allowed=false,reads=0;
  const route=load('src/app/api/clubs/[clubId]/bank/route.ts',{
    zod:require('zod'),'@/lib/auth/auth':{requireAuth:async()=>({id:'a'})},
    '@/lib/auth/authorization':{requireClubAdmin:async(id,club)=>{assert.equal(club,'own');if(!allowed)throw Error('FORBIDDEN')}},
    '@/lib/prisma':{prisma:{clubBankDetails:{findUnique:async({where})=>{reads++;assert.equal(where.clubId,'own');return {accountNumber:'00123'}}}}}
  });
  const ctx={params:{clubId:'own'}},req=new Request('https://local.test/');
  assert.equal((await route.GET(req,ctx)).status,403);assert.equal(reads,0);
  allowed=true;const response=await route.GET(req,ctx);
  assert.equal((await response.json()).details.accountNumber,'00123');assert.match(response.headers.get('Cache-Control'),/no-store/);
});

const receiptContext = {params:Promise.resolve({paymentId:"p"})};
function receiptHandler(payment,stripe) {
  return load('src/app/api/payments/[paymentId]/receipt/route.ts',{
    '@/lib/auth/auth':{requireAuth:async()=>({id:'buyer'})},
    '@/lib/prisma':{prisma:{payment:{findFirst:async({where})=>{
      assert.deepEqual({...where},{id:'p',userId:'buyer',status:'PAID'});
      return payment;
    }}}},
    '@/lib/stripe':{stripe}
  }).GET;
}
test('completed payment opens its hosted invoice without caching the private redirect',async()=>{
  const stripe={invoices:{retrieve:async id=>{
    assert.equal(id,'in_1');return {hosted_invoice_url:'https://invoice.stripe.com/i/example'};
  }}};
  const res=await receiptHandler({stripeInvoiceId:'in_1'},stripe)({},receiptContext);
  assert.equal(res.status,303);
  assert.equal(res.headers.get('location'),'https://invoice.stripe.com/i/example');
  assert.match(res.headers.get('cache-control'),/no-store/);
});
test('legacy checkout-only payment resolves its successful charge receipt',async()=>{
  const stripe={checkout:{sessions:{retrieve:async()=>({payment_intent:'pi_1'})}},
    paymentIntents:{retrieve:async id=>{
      assert.equal(id,'pi_1');return {latest_charge:{receipt_url:'https://pay.stripe.com/receipts/example'}};
    }}};
  const res=await receiptHandler({stripeCheckoutSessionId:'cs_1'},stripe)({},receiptContext);
  assert.equal(res.headers.get('location'),'https://pay.stripe.com/receipts/example');
});
test('ineligible payment does not contact Stripe or redirect',async()=>{
  const res=await receiptHandler(null,{})({},receiptContext);
  assert.equal(res.status,404);assert.equal(res.headers.get('location'),null);
});
