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
import {randomUUID,createHmac} from "node:crypto";
import {writeFileSync} from "node:fs";
import jwt from "jsonwebtoken";
import {PrismaClient} from "@prisma/client";
// Pruebas con datos desechables y peticiones reales; nunca se conectan a una base de producción.
const base=process.env.TEST_BASE_URL,url=process.env.TEST_DATABASE_URL;
if(!base||!url||!process.env.JWT_SECRET)throw Error('Configura TEST_BASE_URL, TEST_DATABASE_URL y JWT_SECRET');
for(const value of [base,url])if(!['localhost','127.0.0.1'].includes(new URL(value).hostname))throw Error('Sólo se admiten servidores locales de pruebas');
const db=new PrismaClient({datasources:{db:{url}}}),users=[],entities=[],checks=[];
const suffix=randomUUID().slice(0,8),tag='música'+suffix;
const token=id=>jwt.sign({userId:id,email:'fixture@example.test',globalRole:'USER'},process.env.JWT_SECRET,{expiresIn:'30m'});
async function request(path,status=200,user,method='GET',body){
 const response=await fetch(new URL(path,base),{method,redirect:'manual',headers:{...(user?{cookie:`auth_token=${token(user)}`} :{}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body)});
 const text=await response.text();assert.equal(response.status,status,`${method} ${path}: ${text.slice(0,500)}`);
 checks.push({method,path,status});return response.headers.get('content-type')?.includes('application/json')?JSON.parse(text):text;
}
try{
 for(let i=0;i<6;i++)users.push(await db.user.create({data:{firstName:'Prueba',lastName:'Klan',email:randomUUID()+'@example.test',passwordHash:'not-a-login-password'}}));
 for(let i=0;i<3;i++)entities.push(await db.entity.create({data:{name:['Círculo Quito','Círculo Galápagos','Círculo suspendido'][i],slug:'test-'+randomUUID(),status:i===2?'SUSPENDED':'ACTIVE'}}));
 const [admin,other,member,optionalApplicant,requiredApplicant,noDocsApplicant]=users.map(u=>u.id),[a,b,c]=entities.map(e=>e.id);
 for(const [userId,entityId,role] of [[admin,a,'ENTITY_ADMIN'],[other,b,'ENTITY_ADMIN'],[member,a,'MEMBER']])await db.entityMembership.create({data:{userId,entityId,role}});
 const rules=`/api/entities/${a}/rules`,plans=`/api/entities/${a}/membership-plans`,apps=`/api/entities/${a}/membership-applications`;
 assert.deepEqual((await request(rules)).rules,[]);
 await request(rules,401,undefined,'POST',{});await request(rules,403,member,'POST',{});await request(rules,403,other,'POST',{});
 for(const body of ['{',{}, {title:'A',content:'B',sortOrder:-1},{title:'A',content:'B',sortOrder:1,entityId:b}])await request(rules,400,admin,'POST',body);
 const rule=(await request(rules,201,admin,'POST',{title:'Respeto',content:'Escuchamos a todos.',sortOrder:2})).rule;
 const first=(await request(rules,201,admin,'POST',{title:'Bienvenida',content:'Todas las personas son bienvenidas.',sortOrder:1})).rule;
 assert.deepEqual((await request(rules)).rules.map(r=>r.id),[first.id,rule.id]);
 const edit={title:'Convivencia',content:'Cuidamos el espacio compartido.',sortOrder:0,version:1};
 await request(`/api/entities/${b}/rules/${rule.id}`,404,other,'PATCH',edit);
 assert.equal((await request(rules+'/'+rule.id,200,admin,'PATCH',edit)).rule.version,2);
 await request(rules+'/'+rule.id,409,admin,'PATCH',edit);
 await request(rules+'/'+rule.id,409,admin,'DELETE',{version:1});
 await request(rules+'/'+rule.id,200,admin,'DELETE',{version:2});
 await request(`/api/entities/${c}/rules`,404);await request(rules+'/document',403,member,'DELETE',{version:0});
 await request(rules+'/document',409,admin,'DELETE',{version:9});
 await db.entity.update({where:{id:a},data:{rulesDocumentUrl:'https://example.test/estatuto.pdf',rulesDocumentFileName:'estatuto.pdf'}});
 const document=await request(rules);assert.equal(document.document.name,'estatuto.pdf');assert.equal(document.document.rulesDocumentFileKey,undefined);
 await request(rules+'/document',200,admin,'DELETE',{version:0});assert.equal((await request(rules)).document,null);
 // El índice debe coincidir con lo renderizado y excluir círculos suspendidos y coincidencias parciales.
 for(const [entityId,content] of [[a,'#MÚSICA13 #Quito'],[b,'#Mu\u0301sica13 #Islas'],[c,'#música13'],[a,'https://example.test/#música13 #música132']])await db.post.create({data:{entityId,authorId:admin,title:'Encuentro',content:content.replaceAll('13',suffix)}});
 const hashtag='/api/posts/hashtags?tag='+encodeURIComponent('MÚSICA'+suffix)+'&entityId='+a;
 const local=await request(hashtag);assert.equal(local.pagination.total,1);assert.equal(local.posts[0].entity.id,a);assert.equal(local.posts[0].author.email,undefined);
 assert.equal((await request(hashtag+'&scope=all')).pagination.total,2);
 assert.equal((await request(hashtag+'&scope=all&limit=1')).pagination.hasNextPage,true);
 await request(hashtag+'&scope=private',400);await request('/api/posts/hashtags?tag=bad%23tag&entityId='+a,400);
 await request('/api/posts/hashtags?tag=hola&entityId='+c,404);
 const post=(await request(`/api/entities/${a}/posts`,201,admin,'POST',{title:'Nuevo #MÚSICA'+suffix,content:'https://example.test/#oculto'})).post;
 assert.deepEqual((await db.post.findUniqueOrThrow({where:{id:post.id}})).hashtags,[tag]);
 await request(`/api/entities/${a}/posts/${post.id}`,200,admin,'PATCH',{title:'Actualizado #Danza13',content:'Bienvenidos'});
 assert.equal((await request(hashtag)).pagination.total,1);
 await request('/api/link-preview?url=http%3A%2F%2F127.0.0.1%2F',400);
 await request('/api/link-preview?url=javascript%3Aalert(1)',400);
 // No se aceptan direcciones manuales ni tokens reutilizados por otro usuario.
 await request('/api/locations/resolve',401,undefined,'POST',{latitude:0,longitude:0});
 const foreign=await request('/api/locations/resolve',400,admin,'POST',{latitude:4.7,longitude:-74.1});assert.equal(foreign.message,'Esta ubicación está fuera del Ecuador');
 await request('/api/locations/resolve',400,admin,'POST',{latitude:999,longitude:0});
 await request('/api/entities',400,admin,'POST',{name:'Manual',slug:'manual-'+randomUUID(),address:'Quito'});
 await request(`/api/entities/${a}`,400,admin,'PATCH',{googleMapsUrl:'https://example.test'});
 await request(`/api/entities/${a}`,400,admin,'PATCH',{locationToken:'forged'});
 const location={latitude:-0.743,longitude:-90.315,address:'Puerto Ayora',googleMapsUrl:'https://example.test/ignored'};
 const proof=jwt.sign(location,createHmac('sha256',process.env.JWT_SECRET).update('klan-location-selection').digest(),{subject:admin,audience:'klan-location',expiresIn:'10m'});
 await request(`/api/entities/${a}`,200,admin,'PATCH',{locationToken:proof});
 const located=await db.entity.findUniqueOrThrow({where:{id:a}});assert.equal(located.address,'Puerto Ayora');assert.equal(located.googleMapsUrl,'https://www.google.com/maps/search/?api=1&query=-0.743,-90.315');
 await request(`/api/entities/${b}`,400,other,'PATCH',{locationToken:proof});
 // Se conserva el contrato antiguo, pero la bandera no autoriza ni bloquea admisiones.
 const planInput={name:'Plan libre',price:0,type:'FREE',durationValue:1,durationUnit:'MONTH',requiresDocumentation:true};
 for(const body of ['{','null',{}, {name:'Incompleto'}])await request(plans,400,admin,'POST',body);
 await request(plans,403,member,'POST',planInput);
 const noDocs=(await request(plans,201,admin,'POST',planInput)).plan;
 assert.equal((await db.membershipPlan.findUniqueOrThrow({where:{id:noDocs.id}})).requiresDocumentation,false);
 const optional=(await request(plans,201,admin,'POST',{...planInput,name:'Con documento opcional'})).plan;
 const optionalReq=(await request(plans+'/'+optional.id+'/document-requirements',201,admin,'POST',{name:'Presentación',isRequired:false})).requirement;
 const optionalApp=(await request(apps,201,optionalApplicant,'POST',{planId:optional.id}));
 assert.equal(optionalApp.documentRequirements[0].id,optionalReq.id);
 await request(apps+'/'+optionalApp.application.id+'/submit',200,optionalApplicant,'POST',{});
 await request(apps+'/'+optionalApp.application.id+'/review',200,admin,'PATCH',{status:'APPROVED'});
 assert.equal((await db.entityMembership.findUniqueOrThrow({where:{userId_entityId:{userId:optionalApplicant,entityId:a}}})).status,'ACTIVE');
 const required=(await request(plans,201,admin,'POST',{...planInput,name:'Con documento obligatorio'})).plan;
 const req=(await request(plans+'/'+required.id+'/document-requirements',201,admin,'POST',{name:'Identificación',isRequired:true})).requirement;
 await request(plans+'/'+required.id,200,admin,'PATCH',{requiresDocumentation:false});
 assert.equal((await db.membershipPlan.findUniqueOrThrow({where:{id:required.id}})).requiresDocumentation,true);
 const application=(await request(apps,201,requiredApplicant,'POST',{planId:required.id})).application;
 const review=apps+'/'+application.id+'/review';
 await request(apps+'/'+application.id+'/submit',409,requiredApplicant,'POST',{});await request(review,400,admin,'PATCH',{status:'APPROVED'});
 const doc=await db.membershipDocument.create({data:{applicationId:application.id,requirementId:req.id,fileUrl:'https://example.test/test.pdf'}});
 await request(apps+'/'+application.id+'/submit',200,requiredApplicant,'POST',{});await request(review,400,admin,'PATCH',{status:'APPROVED'});
 await db.membershipDocument.update({where:{id:doc.id},data:{status:'APPROVED'}});
 await request(review,200,admin,'PATCH',{status:'APPROVED'});
 const emptyApp=(await request(apps,201,noDocsApplicant,'POST',{planId:noDocs.id})).application;
 const inactive=await db.planDocumentRequirement.create({data:{planId:noDocs.id,name:'Antiguo',isRequired:true,isActive:false}});
 await request(apps+'/'+emptyApp.id+'/submit',200,noDocsApplicant,'POST',{});await request(apps+'/'+emptyApp.id+'/review',200,admin,'PATCH',{status:'APPROVED'});
 assert.ok(inactive.id);await request('/api/test-db',404);
 await request(`/api/entities/${a}/members/${member}`,403,other,'DELETE');
 for(const path of ['/', '/entities',`/entity/${a}?tab=rules`, '/hashtags?entity='+a+'&tag=música13'])assert.match(await request(path),/Klan/);
 await db.post.create({data:{entityId:a,authorId:admin,title:'Video de la comunidad',content:'https://www.youtube.com/watch?v=dQw4w9WgXcQ https://www.wikipedia.org/',imageUrl:base+'/brand/klan-icon.png'}});
 await db.post.create({data:{entityId:a,authorId:admin,title:'Artículo de la comunidad',content:'https://www.wikipedia.org/ https://www.youtube.com/watch?v=dQw4w9WgXcQ'}});
 const result={result:'PASS',httpRequests:checks.length,checks};
 if(process.env.TEST_RESULT_PATH)writeFileSync(process.env.TEST_RESULT_PATH,JSON.stringify(result,null,2)+'\n');
 if(process.env.TEST_FIXTURES_PATH)writeFileSync(process.env.TEST_FIXTURES_PATH,JSON.stringify({admin,member:optionalApplicant,a,b,c,tag,token:token(admin),memberToken:token(optionalApplicant),ruleId:first.id,optionalPlan:optional.id},null,2));
 console.log(JSON.stringify({result:'PASS',httpRequests:checks.length,groups:['Reglas: CRUD, orden, permisos, aislamiento y concurrencia','PDF: lectura y eliminación por versión','Hashtags: ámbito, Unicode, paginación y edición','Ubicación: territorio, token y ciudad','Admisión: obligatorios, opcionales y requisitos inactivos','Regresión HTTP 400/401/403/404 y rutas públicas']},null,2));
}finally{
 if(!process.env.TEST_KEEP_FIXTURES){await db.entity.deleteMany({where:{id:{in:entities.map(e=>e.id)}}});await db.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});}
 await db.$disconnect();
}
