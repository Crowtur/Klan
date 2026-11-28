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

import test from "node:test";
import assert from "node:assert/strict";
import {renderToStaticMarkup} from "react-dom/server";
import jwt from "jsonwebtoken";
import {tokenizePost,extractHashtags,firstPostLink,videoEmbed} from "../src/lib/posts/content";
import {isPublicAddress,previewUrl,parseLinkMetadata} from "../src/lib/posts/link-preview";
import {cityCatalog,searchCities,nearestCity} from "../src/lib/locations/city-catalog";
import {cityInEcuador,possibleEcuador,OUTSIDE_ECUADOR} from "../src/lib/locations/ecuador";
import {resolveLocation,verifiedLocation} from "../src/lib/locations/verified-location";
import {cropRectangle} from "../src/lib/image-crop";
import {requireEntityContentAdmin} from "../src/lib/entities/content-access";
import {PostCard} from "../src/components/workspace/post-card";
import {PlanCard} from "../src/components/workspace/plan-card";
import {planFields,entityFields} from "../src/components/workspace/common";

// Los casos prueban límites y contratos; las llamadas externas se sustituyen por respuestas controladas.
test('las etiquetas conservan Unicode, límites de palabra y todos los caracteres del texto',()=>{
  const text='¡#Música! #MÚSICA #danza_2026 abc#no https://example.org/a#oculto\n#Quito';
  assert.deepEqual(extractHashtags(text),['danza_2026','música','quito']);
  assert.equal(tokenizePost(text).map(t=>t.text).join(''),text);
  assert.deepEqual(extractHashtags('#Mu\u0301sica'),['música']);
  assert.deepEqual(extractHashtags('#'+'a'.repeat(65)),[]);
});
test('enlaces con paréntesis y puntuación no alteran el contenido ni habilitan protocolos ejecutables',()=>{
  const text='Mira (https://example.org/a(b)). Y www.example.org, #fin';
  assert.equal(tokenizePost(text).map(t=>t.text).join(''),text);
  assert.deepEqual(tokenizePost(text).filter(t=>t.kind==='url').map(t=>t.value),['https://example.org/a(b)','https://www.example.org/']);
  assert.equal(tokenizePost('javascript:alert(1) data:text/html,<script>').some(t=>t.kind==='url'),false);
});
test('sólo el primer enlace en orden de lectura produce una vista previa y precede a la foto',()=>{
  const html=renderToStaticMarkup(<PostCard post={{id:'p',entity:{id:'e',name:'Círculo'},title:'https://example.org/primero',content:'#Danza https://example.org/segundo',imageUrl:'https://images.example.org/foto.jpg',createdAt:'2026-11-27'}}/>);
  assert.equal((html.match(/class="post-link-preview"/g)||[]).length,1);
  assert.ok(html.indexOf('class="post-link-preview"')<html.indexOf('class="feed-image"'));
  assert.match(html,/\/hashtags\?tag=danza&amp;entity=e/);
  assert.match(html,/rel="noopener noreferrer"/);
  assert.equal(firstPostLink('www.example.org/a','https://other.org/b'),'https://www.example.org/a');
});
test('los cinco proveedores sólo generan iframes para hosts e identificadores conocidos',()=>{
  for(const [url,provider] of [['https://youtu.be/dQw4w9WgXcQ','YouTube'],['https://www.instagram.com/reel/AbC_123/','Instagram'],['https://www.facebook.com/example/videos/12345','Facebook'],['https://www.linkedin.com/feed/update/urn:li:activity:123456789','LinkedIn'],['https://www.tiktok.com/@sample/video/1234567890','TikTok']])assert.equal(videoEmbed(url)?.provider,provider);
  for(const url of ['https://youtube.com.evil.org/watch?v=dQw4w9WgXcQ','javascript:alert(1)','https://www.linkedin.com/%ZZ','https://www.instagram.com/accounts/login/'])assert.equal(videoEmbed(url),null);
});
test('las vistas previas bloquean direcciones privadas, numéricas alternativas, IPv6 y credenciales',()=>{
  for(const address of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.2.3','192.168.1.1','100.64.0.1','::1','::ffff:127.0.0.1','fe80::1','fd00::1','2001:db8::1'])assert.equal(isPublicAddress(address),false,address);
  assert.equal(isPublicAddress('8.8.8.8'),true);assert.equal(isPublicAddress('2606:4700:4700::1111'),true);
  for(const url of ['http://2130706433','http://0x7f000001','http://[::1]','https://user:pass@example.org','http://localhost','http://example.org:8080','file:///etc/passwd'])assert.throws(()=>previewUrl(url));
});
test('los metadatos son texto limitado, con URL relativa resuelta y sin HTML devuelto',()=>{
  const metadata=parseLinkMetadata('<title>Alternativo</title><meta content="Título &amp; comunidad" property="og:title"><meta name="description" content="<b>Hola</b>"><meta property="og:image" content="/foto.png">',new URL('https://example.org/a'));
  assert.equal(metadata.title,'Título & comunidad');assert.equal(metadata.description,'Hola');assert.equal(metadata.image,'https://example.org/foto.png');
  assert.equal(parseLinkMetadata('<title>'+('x'.repeat(1000))+'</title>',new URL('https://example.org')).title.length,180);
});
const result=(country:string,city?:string)=>({address_components:[{long_name:country,short_name:country,types:['country']},...(city?[{long_name:city,short_name:city,types:['locality']}]:[])]});
test('Ecuador incluye Galápagos y la ciudad se toma sin calles, provincias ni país',()=>{
  assert.equal(possibleEcuador({latitude:-.18,longitude:-78.47}),true);
  assert.equal(possibleEcuador({latitude:-.744,longitude:-90.313}),true);
  assert.equal(cityInEcuador([result('EC','Puerto Ayora')]),'Puerto Ayora');
  assert.equal(cityInEcuador([result('EC','Quito')]),'Quito');
  assert.equal(cityInEcuador([result('EC')]),'');
  assert.equal(cityInEcuador([result('EC','El Comité del Pueblo')]),'Quito');
});
test('una parroquia identificada como sector cede prioridad al cantón y una localidad explícita tiene preferencia',()=>{
  const components=result('EC','Sector Norte');
  const component=(name:string,type:string)=>({long_name:name,short_name:name,types:[type]});
  components.address_components.push(component('Sector Norte','sublocality_level_1'),component('Cantón Quito','administrative_area_level_2'));
  assert.equal(cityInEcuador([components]),'Quito');
  assert.equal(cityInEcuador([components,{...result('EC','Puerto Ayora'),types:['locality']}]),'Puerto Ayora');
});
test('un punto extranjero dentro del rectángulo también se rechaza por su país real',()=>{
  assert.equal(possibleEcuador({latitude:-4,longitude:-79}),true);
  assert.throws(()=>cityInEcuador([result('PE','Ciudad extranjera'),result('EC','Ciudad cercana')]),new RegExp(OUTSIDE_ECUADOR));
  assert.equal(possibleEcuador({latitude:-12,longitude:-77}),false);
  assert.equal(possibleEcuador({latitude:NaN,longitude:0}),false);
});
test('la selección de mapa está firmada, vinculada al usuario y separada del token de sesión',async()=>{
  const previous=globalThis.fetch,secret=process.env.JWT_SECRET,key=process.env.GOOGLE_MAPS_SERVER_API_KEY;
  process.env.JWT_SECRET='test-location-only';process.env.GOOGLE_MAPS_SERVER_API_KEY='test-key';
  globalThis.fetch=(async()=>Response.json({status:'OK',results:[result('EC','Quito')]})) as typeof fetch;
  try {
    const selected=await resolveLocation({latitude:-.18,longitude:-78.47},'user-one');
    assert.equal(verifiedLocation(selected.token,'user-one').address,'Quito');
    assert.equal(verifiedLocation(selected.token,'user-one',' Ciudad corregida ').address,'Ciudad corregida');
    assert.throws(()=>verifiedLocation(selected.token,'user-one','  '),/INVALID_LOCATION/);
    assert.throws(()=>verifiedLocation(selected.token,'user-two'),/INVALID_LOCATION/);
    assert.throws(()=>verifiedLocation(selected.token+'x','user-one'),/INVALID_LOCATION/);
    assert.throws(()=>jwt.verify(selected.token,process.env.JWT_SECRET!));
    assert.equal(new URL(verifiedLocation(selected.token,'user-one').googleMapsUrl).searchParams.get('query'),'-.18,-78.47'.replace('-.18','-0.18'));
  }finally{globalThis.fetch=previous;if(secret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=secret;if(key===undefined)delete process.env.GOOGLE_MAPS_SERVER_API_KEY;else process.env.GOOGLE_MAPS_SERVER_API_KEY=key;}
});
test('el recorte centrado y sus extremos permanecen dentro de la imagen original',()=>{
  assert.deepEqual(cropRectangle(1200,800,1,1,50,50),{x:200,y:0,width:800,height:800});
  for(const x of [-5,0,50,100,200])for(const y of [0,50,100])for(const ratio of [1,3,16/9]){
    const crop=cropRectangle(1200,800,ratio,2,x,y);assert.ok(crop.x>=0&&crop.y>=0);assert.ok(crop.x+crop.width<=1200.001&&crop.y+crop.height<=800.001);
  }
});
test('el formulario elimina la casilla y la entrada manual; los requisitos opcionales siguen visibles',()=>{
  assert.equal(planFields.some(field=>field.name==='requiresDocumentation'),false);
  assert.equal(entityFields.some(field=>['address','googleMapsUrl'].includes(field.name)),false);
  const html=renderToStaticMarkup(<PlanCard plan={{name:'Plan',type:'FREE',price:0,durationValue:1,durationUnit:'MONTH',requiresDocumentation:false,documentRequirements:[{name:'Opcional',isRequired:false,isActive:true},{name:'Retirado',isActive:false}]}} showRequirements>Solicitar</PlanCard>);
  assert.match(html,/Opcional/);assert.doesNotMatch(html,/Retirado/);assert.match(html,/1 requisito documental/);
});
test('la administración de reglas rechaza usuarios y círculos inactivos y roles de otro contexto',async()=>{
  const db=(role='USER',status='ACTIVE',entityStatus='ACTIVE',member=0)=>({user:{findUnique:async()=>({globalRole:role,status})},entity:{findUnique:async()=>({id:'entity',status:entityStatus})},entityMembership:{count:async(q:any)=>{assert.equal(q.where.entityId,'entity');assert.equal(q.where.role,'ENTITY_ADMIN');return member;}}}) as any;
  await assert.rejects(()=>requireEntityContentAdmin('user','entity',db()),/FORBIDDEN/);
  await requireEntityContentAdmin('user','entity',db('USER','ACTIVE','ACTIVE',1));
  await requireEntityContentAdmin('user','entity',db('SUPER_ADMIN'));
  await assert.rejects(()=>requireEntityContentAdmin('user','entity',db('SUPER_ADMIN','SUSPENDED')),/FORBIDDEN/);
  await assert.rejects(()=>requireEntityContentAdmin('user','entity',db('SUPER_ADMIN','ACTIVE','SUSPENDED')),/FORBIDDEN/);
});

test("el catálogo cubre las provincias y resuelve todas sus cabeceras y alias", async()=>{
  assert.equal(new Set(cityCatalog.map(c=>c.province)).size,24);
  assert.equal(cityCatalog.length,223);
  const key=process.env.GOOGLE_MAPS_SERVER_API_KEY, secret=process.env.JWT_SECRET;
  delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
  process.env.JWT_SECRET="test-location";
  try{
    for(const city of cityCatalog){
      const point={latitude:city.lat,longitude:city.lng};
      assert.equal((await resolveLocation(point,"prueba")).address,city.name);
      for(const name of [city.name,...city.aliases]){
        assert.ok(searchCities(name+", "+city.province,false).includes(city),name);
      }
    }
    assert.equal(searchCities("Olmedo",false).length,2);
    assert.equal(searchCities("Chinchipe",false)[0].name,"Zumba");
    assert.equal(searchCities("Quininde",false)[0].name,"Rosa Zárate");
  }finally{
    if(key===undefined)delete process.env.GOOGLE_MAPS_SERVER_API_KEY;else process.env.GOOGLE_MAPS_SERVER_API_KEY=key;
    if(secret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=secret;
  }
});
test("un punto remoto conserva su ciudad más próxima ante barrios, cuota o caída del proveedor",async()=>{
  const point={latitude:-1.2,longitude:-76.4};
  const fetchOriginal=globalThis.fetch,key=process.env.GOOGLE_MAPS_SERVER_API_KEY,secret=process.env.JWT_SECRET;
  process.env.JWT_SECRET="test-location";process.env.GOOGLE_MAPS_SERVER_API_KEY="fixture";
  try{
    for(const body of [{status:"OK",results:[result("EC","Barrio sin cabecera")]},{status:"OVER_QUERY_LIMIT"},{status:"ZERO_RESULTS"},null]){
      globalThis.fetch=async()=>{if(!body)throw Error("sin conexión");return Response.json(body);};
      assert.equal((await resolveLocation(point,"prueba")).address,nearestCity(point).name);
      await assert.rejects(resolveLocation({latitude:0,longitude:-90},"prueba"),new RegExp(OUTSIDE_ECUADOR));
    }
  }finally{
    globalThis.fetch=fetchOriginal;
    if(key===undefined)delete process.env.GOOGLE_MAPS_SERVER_API_KEY;else process.env.GOOGLE_MAPS_SERVER_API_KEY=key;
    if(secret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=secret;
  }
});
