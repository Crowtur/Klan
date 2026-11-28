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

const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),ts=require('typescript'),{EventEmitter}=require('node:events');
// Se simulan DNS y transporte para verificar el bloqueo antes de conectar, sin acceder a redes ajenas.
function preview({addresses,redirect,large=false}){
 const connections=[];
 const transport={request:(url,options,callback)=>{
  connections.push(url.href);const request=new EventEmitter();
  request.end=()=>queueMicrotask(()=>{
   options.lookup(url.hostname,{all:true},(error,list)=>{assert.equal(error,null);assert.equal(list[0].address,'93.184.216.34');});
   options.lookup(url.hostname,{},(error,address,family)=>{assert.equal(error,null);assert.equal(address,'93.184.216.34');assert.equal(family,4);});
   const response=new EventEmitter();response.statusCode=redirect?302:200;response.headers=redirect?{location:redirect}:{'content-type':'text/html',...(large?{'content-length':'524289'}:{})};response.destroy=()=>{};
   callback(response);if(!redirect&&!large){response.emit('data',Buffer.from('<title>Destino público</title>'));response.emit('end');}
  });return request;
 }};
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync('src/lib/posts/link-preview.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>name==='node:dns/promises'?{lookup:async()=>addresses}:['node:http','node:https'].includes(name)?transport:require(name),URL,Buffer,AbortController,setTimeout,clearTimeout});
 return {api:module.exports,connections};
}
test('un DNS mixto público/privado bloquea el enlace antes de abrir conexiones',async()=>{
 const p=preview({addresses:[{address:'93.184.216.34',family:4},{address:'127.0.0.1',family:4}]});
 assert.equal((await p.api.linkPreview('https://public.org')).available,false);assert.equal(p.connections.length,0);
});
test('la conexión usa el DNS fijado y rechaza redirecciones a una red privada',async()=>{
 const p=preview({addresses:[{address:'93.184.216.34',family:4}],redirect:'http://169.254.169.254/latest/meta-data/'});
 assert.equal((await p.api.linkPreview('https://public.org')).available,false);assert.equal(p.connections.length,1);
});
test('metadatos públicos y límite de tamaño comparten la misma conexión validada',async()=>{
 const addresses=[{address:'93.184.216.34',family:4}],good=preview({addresses}),large=preview({addresses,large:true});
 assert.equal((await good.api.linkPreview('https://public.org')).title,'Destino público');assert.equal(good.connections.length,1);
 assert.equal((await large.api.linkPreview('https://public.org')).available,false);assert.equal(large.connections.length,1);
});
