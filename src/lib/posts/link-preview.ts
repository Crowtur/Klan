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

import { lookup } from "node:dns/promises";
import { isIP, BlockList } from "node:net";
import http from "node:http";
import https from "node:https";
/** La extracción usa una conexión con DNS fijado: rechaza redes privadas, redirecciones internas y respuestas ilimitadas. */
const blocked = new BlockList();
for(const [address,prefix] of [["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],["169.254.0.0",16],["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],["192.168.0.0",16],["198.18.0.0",15],["198.51.100.0",24],["203.0.113.0",24],["224.0.0.0",4],["240.0.0.0",4]] as const)blocked.addSubnet(address,prefix,"ipv4");
const global6=new BlockList();global6.addSubnet("2000::",3,"ipv6");
blocked.addSubnet("2001::",23,"ipv6");blocked.addSubnet("2001:db8::",32,"ipv6");blocked.addSubnet("2002::",16,"ipv6");
export function isPublicAddress(address:string) {
  const clean=address.replace(/^\[|\]$/g,"");const family=isIP(clean);
  return family===4?!blocked.check(clean,"ipv4"):family===6&&global6.check(clean,"ipv6")&&!blocked.check(clean,"ipv6");
}
export function previewUrl(value:string) {
  if(value.length>2048)throw Error("INVALID_URL");
  const url=new URL(value);
  if(!["https:","http:"].includes(url.protocol)||url.username||url.password||(url.port&&!['80','443'].includes(url.port)))throw Error("INVALID_URL");
  const host=url.hostname.toLowerCase().replace(/\.$/,"");
  if(!host.includes('.')&&!isIP(host.replace(/^\[|\]$/g,'')))throw Error("INVALID_URL");
  if(/(?:^|\.)(localhost|local|internal|test|invalid|example)$/.test(host))throw Error("INVALID_URL");
  if(isIP(host.replace(/^\[|\]$/g,''))&&!isPublicAddress(host))throw Error("INVALID_URL");
  url.hash="";return url;
}
async function resolvePublic(url:URL) {
  const host=url.hostname.replace(/^\[|\]$/g,"");
  const addresses=isIP(host)?[{address:host,family:isIP(host)}]:await lookup(host,{all:true});
  if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))throw Error("PRIVATE_ADDRESS");
  return addresses[0];
}
async function getHtml(url:URL,signal:AbortSignal,remaining=3):Promise<{html:string;url:URL}> {
  const address=await resolvePublic(url);signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const req=(url.protocol==="https:"?https:http).request(url,{method:"GET",signal,headers:{"User-Agent":"KlanLinkPreview/1.0","Accept":"text/html","Accept-Encoding":"identity"},lookup:((_host:string,options:{all?:boolean},callback:Function)=>options.all?callback(null,[address]):callback(null,address.address,address.family)) as http.RequestOptions["lookup"]},response=>{
      if([301,302,303,307,308].includes(response.statusCode||0)){
        const location=response.headers.location;response.destroy();
        if(!location||remaining===0){reject(Error("REDIRECT_LIMIT"));return;}
        try{void getHtml(previewUrl(new URL(location,url).href),signal,remaining-1).then(resolve,reject);}catch(error){reject(error);}return;
      }
      if(response.statusCode!==200||!String(response.headers['content-type']).toLowerCase().includes('text/html')||Number(response.headers['content-length']||0)>524288){response.destroy();reject(Error("UNAVAILABLE"));return;}
      const chunks:Buffer[]=[];let size=0;
      response.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>524288){response.destroy(Error("TOO_LARGE"));return;}chunks.push(chunk);});
      response.on('error',reject);response.on('end',()=>resolve({html:Buffer.concat(chunks).toString('utf8'),url}));
    });req.on('error',reject);req.end();
  });
}
/** Se decodifica texto únicamente; React escapa el resultado y nunca se devuelve HTML ejecutable. */
function plain(text:string,max:number) {
  return text.replace(/<[^>]*>/g,' ').replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,(_,key:string)=>{
    if(key.startsWith('#')){const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
    return ({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '} as Record<string,string>)[key.toLowerCase()]||'';
  }).replace(/\s+/g,' ').trim().slice(0,max);
}
export function parseLinkMetadata(html:string,url:URL) {
  const meta:Record<string,string>={};
  for(const tag of (html.match(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)||[]).filter(tag=>tag.length<=8192)){
    const attrs:Record<string,string>={};
    for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[match[1].toLowerCase()]=match[2]??match[3]??match[4];
    const name=attrs.property||attrs.name;if(name&&attrs.content)meta[name.toLowerCase()]=attrs.content;
  }
  const title=plain(meta['og:title']||meta['twitter:title']||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||url.hostname,180);
  const description=plain(meta['og:description']||meta.description||meta['twitter:description']||'',320);
  let image:string|undefined;
  try {if(meta['og:image']||meta['twitter:image'])image=previewUrl(new URL(plain(meta['og:image']||meta['twitter:image'],2048),url).href).href;}catch{}
  return {title,description,domain:url.hostname,image};
}
export type LinkMetadata={url:string;title:string;description:string;domain:string;image?:string;available:boolean};
const cache=new Map<string,{expires:number;data:LinkMetadata}>();
let active=0;
export async function linkPreview(input:string):Promise<LinkMetadata> {
  const url=previewUrl(input);const existing=cache.get(url.href);
  if(existing&&existing.expires>Date.now())return existing.data;
  const fallback:LinkMetadata={url:url.href,title:url.hostname,description:"Abrir enlace externo",domain:url.hostname,available:false};
  if(active>=8)return fallback;
  active++;
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),4500);
  const deadline=new Promise<never>((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('TIMEOUT')),{once:true}));
  try {
    // El límite incluye DNS; la conexión fijada impide una segunda resolución susceptible a rebinding.
    const page=await Promise.race([getHtml(url,controller.signal),deadline]);
    const metadata=parseLinkMetadata(page.html,page.url);
    if(metadata.image)try{await Promise.race([resolvePublic(new URL(metadata.image)),deadline]);}catch{delete metadata.image;}
    const data={url:url.href,...metadata,available:true};
    if(cache.size>=200)cache.delete(cache.keys().next().value!);
    cache.set(url.href,{expires:Date.now()+300000,data});return data;
  }catch{return fallback;}finally{clearTimeout(timeout);active--;}
}
