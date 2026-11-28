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

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
// Requiere las fixtures locales de verify-part13.mjs; Playwright es una herramienta externa de validación.
const base=process.env.TEST_BASE_URL,fixturePath=process.env.TEST_FIXTURES_PATH;
if(!base||!fixturePath||!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Configura una instancia local y TEST_FIXTURES_PATH');
const data=JSON.parse(fs.readFileSync(fixturePath,'utf8')),{chromium}=require(process.env.TEST_PLAYWRIGHT_MODULE||'playwright');
let options={headless:true};
if(process.env.TEST_CHROMIUM_MODULE){const {default:runtime}=await import(process.env.TEST_CHROMIUM_MODULE);options={...options,executablePath:await runtime.executablePath(),args:runtime.args};}
const browser=await chromium.launch(options),evidence=process.env.TEST_BROWSER_EVIDENCE,checks=[],errors=[];
if(evidence)fs.mkdirSync(evidence,{recursive:true});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
// La consulta de metadatos se controla para no depender de sitios de terceros durante la revisión visual.
await page.route('**/api/link-preview?*',route=>route.fulfill({json:{success:true,preview:{url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',title:'Video de prueba',description:'Vista previa controlada',domain:'youtube.com',available:true}}}));
const count=async(locator,n)=>{await locator.first().waitFor({state:n?'visible':'hidden'});assert.equal(await locator.count(),n);};
const shot=async name=>{if(evidence)await page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true});};
async function noOverflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Desbordamiento horizontal');}
async function open(tab){await page.goto(base+`/app?view=entity&entity=${data.a}&tab=${tab}`);}
try{
 await page.goto(base+`/entity/${data.b}?tab=rules`);await page.getByText('Todavía no hay registros',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Crear regla',exact:true}).count(),0);checks.push('Reglas públicas vacías y sin administración');
 for(const width of [390,767,768,1280]){await page.setViewportSize({width,height:900});await noOverflow();}
 await context.addCookies([{name:'auth_token',value:data.memberToken,url:base}]);
 await page.goto(base+`/app?view=entity&entity=${data.a}&tab=rules`);await page.getByRole('heading',{name:'Bienvenida',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Crear regla',exact:true}).count(),0);checks.push('Miembro lee reglas sin controles administrativos');
 await context.addCookies([{name:'auth_token',value:data.token,url:base}]);
 await page.setViewportSize({width:1280,height:900});await open('rules');await page.getByRole('button',{name:'Crear regla',exact:true}).click();
 let dialog=page.getByRole('dialog',{name:'Crear regla',exact:true});await dialog.getByLabel('Título',{exact:true}).fill('Regla desde navegador');await dialog.getByLabel('Redacción de la norma').fill('Respetamos el espacio común.');await dialog.getByLabel('Orden',{exact:true}).fill('0');await dialog.getByRole('button',{name:'Guardar regla',exact:true}).click();
 await page.getByRole('heading',{name:'Regla desde navegador',exact:true}).waitFor();
 let card=page.locator('.rule-card').filter({has:page.getByRole('heading',{name:'Regla desde navegador',exact:true})});await card.getByRole('button',{name:'Editar',exact:true}).click();
 dialog=page.getByRole('dialog',{name:'Editar',exact:true});await dialog.getByLabel('Título',{exact:true}).fill('Regla revisada');await dialog.getByLabel('Orden',{exact:true}).fill('5');await dialog.getByRole('button',{name:'Guardar regla',exact:true}).click();await page.getByRole('heading',{name:'Regla revisada',exact:true}).waitFor();
 assert.equal(await page.locator('.rule-card').last().locator('h3').innerText(),'Regla revisada');await shot('reglas-escritorio');
 await page.locator('.rule-card').filter({has:page.getByRole('heading',{name:'Regla revisada',exact:true})}).getByRole('button',{name:'Eliminar',exact:true}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await page.getByRole('heading',{name:'Regla revisada',exact:true}).waitFor({state:'hidden'});checks.push('CRUD y orden de reglas en navegador');
 await page.setViewportSize({width:390,height:844});await open('rules');const trigger=page.locator('.entity-section-trigger');await trigger.click();await page.locator('.entity-sections').getByRole('link',{name:'Planes',exact:true}).click();await page.getByRole('button',{name:'Crear plan',exact:true}).waitFor();assert.equal(await trigger.getAttribute('aria-expanded'),'false');await trigger.click();await trigger.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');checks.push('Navegación móvil y Escape');
 for(const width of [390,767,768,1280]){
  await page.setViewportSize({width,height:900});await open('plans');await page.getByRole('button',{name:'Crear plan',exact:true}).click();dialog=page.getByRole('dialog',{name:'Crear plan',exact:true});
  assert.equal(await dialog.getByText('Requiere documentación',{exact:true}).count(),0);
  const save=await dialog.getByRole('button',{name:'Guardar',exact:true}).boundingBox(),cancel=await dialog.getByRole('button',{name:'Cancelar',exact:true}).boundingBox();assert.ok(save&&cancel);assert.ok(Math.abs(save.y-cancel.y)<5);assert.ok(cancel.x>save.x);await noOverflow();if(width===390)await shot('plan-movil');await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
 }checks.push('Guardar y Cancelar alineados; formulario sin casilla a 390/767/768/1280 px');
 await page.setViewportSize({width:390,height:844});await open('posts');
 await page.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({contentType:'text/html',body:'<p>Reproductor controlado</p>'}));
 const video=page.locator('.feed-card').filter({hasText:'Video de la comunidad'});await video.waitFor();assert.equal(await video.locator('.post-link-preview').count(),1);assert.equal(await video.locator('iframe').count(),0);
 assert.ok(await video.evaluate(card=>!!(card.querySelector('.post-link-preview').compareDocumentPosition(card.querySelector('.feed-image'))&Node.DOCUMENT_POSITION_FOLLOWING)));
 await video.getByRole('button',{name:'Reproducir contenido de YouTube'}).click();await video.locator('iframe').waitFor();await video.getByRole('link',{name:'Abrir en YouTube ↗'}).waitFor();
 const article=page.locator('.feed-card').filter({hasText:'Artículo de la comunidad'});assert.equal(await article.locator('.link-preview-card').count(),1);assert.equal(await article.locator('.video-poster').count(),0);await noOverflow();checks.push('Una vista previa por publicación, antes de la imagen; video bajo demanda y tarjeta genérica');
 await page.getByRole('button',{name:'Crear publicación',exact:true}).click();dialog=page.getByRole('dialog',{name:'Crear publicación',exact:true});await dialog.getByLabel('Contenido',{exact:true}).fill('Encuentro #Música13 https://www.youtube.com/watch?v=dQw4w9WgXcQ https://www.wikipedia.org/');await dialog.getByText('Vista previa del texto y etiquetas').click();await dialog.locator('a.post-hashtag').waitFor();assert.equal(await dialog.locator('.post-text-draft a[target="_blank"][rel="noopener noreferrer"]').count(),2);
 const sharp=require('sharp'),buffer=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="400" height="400" fill="red"/><rect x="400" width="400" height="400" fill="blue"/></svg>')).png().toBuffer();
 const file={name:'prueba.png',mimeType:'image/png',buffer};await dialog.locator('input[type="file"]').setInputFiles(file);
 let crop=page.getByRole('dialog',{name:'Ajustar imagen'});await crop.getByRole('button',{name:'Aplicar recorte',exact:true}).waitFor();await crop.locator('select').selectOption('1');const bounds=await crop.boundingBox();assert.ok(bounds&&bounds.y>=0&&bounds.y+bounds.height<=850);assert.ok(Math.abs(bounds.y+bounds.height/2-422)<8);await crop.getByLabel('Posición horizontal',{exact:true}).fill('0');
 const pixel=()=>crop.locator('canvas').evaluate(canvas=>Array.from(canvas.getContext('2d').getImageData(canvas.width/2,canvas.height/2,1,1).data));
 await page.waitForFunction(()=>{const c=document.querySelector('.image-crop-modal canvas'),p=c?.getContext('2d')?.getImageData(c.width/2,c.height/2,1,1).data;return p&&p[0]>200&&p[2]<20});assert.ok((await pixel())[0]>200);
 await crop.getByLabel('Posición horizontal',{exact:true}).fill('100');await page.waitForFunction(()=>{const c=document.querySelector('.image-crop-modal canvas'),p=c?.getContext('2d')?.getImageData(c.width/2,c.height/2,1,1).data;return p&&p[2]>200&&p[0]<20});await noOverflow();await shot('recorte-movil');
 await crop.getByRole('button',{name:'Cancelar / elegir otra',exact:true}).click();assert.equal(await dialog.locator('.composer-preview').count(),0);
 await dialog.locator('input[type="file"]').setInputFiles(file);crop=page.getByRole('dialog',{name:'Ajustar imagen'});await crop.locator('select').selectOption('1');await crop.getByLabel('Posición horizontal',{exact:true}).fill('100');await crop.getByRole('button',{name:'Aplicar recorte',exact:true}).click();await dialog.locator('.composer-preview').waitFor();
 const exported=await dialog.locator('.composer-preview').evaluate(async image=>{await image.decode();const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;c.getContext('2d').drawImage(image,0,0);return{width:c.width,height:c.height,pixel:Array.from(c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data)};});assert.equal(exported.width,exported.height);assert.ok(exported.pixel[2]>180&&exported.pixel[0]<40);await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();checks.push('Recorte real: cancelar no adjunta; confirmar exporta el encuadre visible en WebP');
 await page.goto(base+'/hashtags?entity='+data.a+'&tag='+encodeURIComponent(data.tag));await page.locator('.feed-card').first().waitFor();assert.equal(await page.locator('.feed-card').count(),1);const checkbox=page.getByRole('checkbox',{name:'Ver publicaciones de todos los círculos'});assert.equal(await checkbox.isChecked(),false);await checkbox.check();await page.waitForFunction(()=>document.querySelectorAll('.feed-card').length===2);await checkbox.uncheck();await page.waitForFunction(()=>document.querySelectorAll('.feed-card').length===1);await noOverflow();checks.push('Hashtag alterna círculo/global/círculo en vivo');
 await open('settings');await page.getByRole('button',{name:'Ubicación',exact:true}).click();await page.getByRole('dialog',{name:'Elegir ubicación en el mapa'}).getByRole('alert').waitFor();assert.equal(await page.getByRole('button',{name:'Usar ubicación',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'Cerrar mapa',exact:true}).click();checks.push('Mapa sin clave muestra estado controlado e impide confirmar');
 // El SDK y la geocodificación se controlan aquí; se prueban búsqueda, marcador y estado, sin credenciales reales.
 await page.evaluate(()=>{
  let current;
  class Map {constructor(element){this.listeners={};current=this;element.innerHTML='';for(const [name,lat,lng] of [['Punto Quito',-.18,-78.47],['Punto Galápagos',-.743,-90.315],['Punto exterior',4.7,-74.1]]){const button=document.createElement('button');button.type='button';button.textContent=name;button.onclick=()=>this.listeners.click?.({latLng:{lat:()=>lat,lng:()=>lng}});element.appendChild(button);}}addListener(name,fn){this.listeners[name]=fn;return{remove:()=>delete this.listeners[name]};}setCenter(){}setZoom(){}}
  class Marker {constructor(options){Object.assign(this,options);}addListener(){return{remove(){}};}}
  class Geocoder {async geocode(){return{results:[{geometry:{location:{lat:()=>-.18,lng:()=>-78.47}}}]};}}
  window.google={maps:{Map,marker:{AdvancedMarkerElement:Marker},Geocoder}};
 });
 await page.route('**/api/locations/resolve',async route=>{const point=route.request().postDataJSON();await route.fulfill({json:{success:true,location:{...point,address:point.longitude<-89?'Puerto Ayora':'Quito',googleMapsUrl:'https://www.google.com/maps/search/?api=1&query='+point.latitude+','+point.longitude,token:'selection-controlled-for-ui-test'}}});});
 await page.getByRole('button',{name:'Ubicación',exact:true}).click();const mapDialog=page.getByRole('dialog',{name:'Elegir ubicación en el mapa'});await mapDialog.getByRole('button',{name:'Punto exterior',exact:true}).click();await mapDialog.getByText('Esta ubicación está fuera del Ecuador',{exact:true}).waitFor();assert.equal(await mapDialog.getByRole('button',{name:'Usar ubicación'}).isDisabled(),true);
 await mapDialog.getByRole('button',{name:'Punto Galápagos',exact:true}).click();await mapDialog.locator('[role="status"]').filter({hasText:'Puerto Ayora'}).waitFor();await mapDialog.getByLabel('Buscar lugar o ciudad').fill('Quito');await mapDialog.getByRole('button',{name:'Buscar',exact:true}).click();await mapDialog.locator('[role="status"]').filter({hasText:'Quito'}).waitFor();await mapDialog.getByRole('button',{name:'Usar ubicación'}).click();await page.locator('.location-summary').getByText('Quito',{exact:true}).waitFor();await noOverflow();checks.push('Mapa con proveedor controlado: país exterior, Galápagos, búsqueda y ciudad confirmada');
 let uploadRequests=0;const observe=request=>{if(request.method()==='POST'&&request.url().includes('/api/uploadthing'))uploadRequests++;};page.on('request',observe);
 for(const [index,ratio] of [[0,1],[1,3]]){await page.locator('.entity-image-settings input[type="file"]').nth(index).setInputFiles(file);const editor=page.getByRole('dialog',{name:'Ajustar imagen'});await editor.getByRole('button',{name:'Aplicar recorte',exact:true}).waitFor();await page.waitForFunction(()=>{const c=document.querySelector('.image-crop-modal canvas');return c&&c.width>0&&c.height>0});const size=await editor.locator('canvas').evaluate(c=>({w:c.width,h:c.height}));assert.ok(Math.abs(size.w/size.h-ratio)<.02);await editor.getByRole('button',{name:'Cancelar / elegir otra'}).click();}
 page.off('request',observe);assert.equal(uploadRequests,0);checks.push('Logo y portada usan proporciones específicas; cancelar no envía archivos');

 assert.deepEqual(errors,[],'Errores JavaScript en navegador');
 const result={result:'PASS',viewports:[390,767,768,1280],checks,javascriptErrors:errors,externalServices:'Metadatos, iframe y SDK/geocodificación de Maps controlados; sin transferencia real a UploadThing ni clave de Google Maps.'};if(evidence)fs.writeFileSync(path.join(evidence,'browser.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}catch(error){await shot('fallo');console.error('URL:',page.url());console.error((await page.locator('body').innerText()).slice(0,6000));throw error;}finally{await browser.close();}
