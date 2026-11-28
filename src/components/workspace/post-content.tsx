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

"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {firstPostLink,tokenizePost,videoEmbed} from "@/lib/posts/content";
import type {LinkMetadata} from "@/lib/posts/link-preview";
/** Conserva saltos y texto normal; los enlaces y hashtags tienen nombres accesibles y destinos explícitos. */
export function PostText({text,entityId}:{text:string;entityId:string}) {
  return <>{tokenizePost(text).map((token,index)=>token.kind==='hashtag'?<Link key={index} className="post-hashtag" href={'/hashtags?'+new URLSearchParams({tag:token.value,entity:entityId})} aria-label={`Ver publicaciones con ${token.text}`}>{token.text}</Link>:token.kind==='url'?<a key={index} href={token.value} target="_blank" rel="noopener noreferrer">{token.text}</a>:token.text)}</>;
}
/** Se presenta sólo el primer enlace, antes de la imagen del post. Los iframes se montan después de una acción explícita. */
export function PostLinkPreview({title,content}:{title?:string|null;content:string}) {
  const url=firstPostLink(title,content);
  return url?<LinkPreview key={url} url={url}/>:null;
}
function LinkPreview({url}:{url:string}) {
  const [preview,setPreview]=useState<LinkMetadata|null>(null),[play,setPlay]=useState(false),[failed,setFailed]=useState(false),[imageFailed,setImageFailed]=useState(false);
  const embed=videoEmbed(url);
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/link-preview?'+new URLSearchParams({url}),{signal:controller.signal}).then(r=>r.json()).then(data=>{if(data.success)setPreview(data.preview);}).catch(()=>{});
    return()=>controller.abort();
  },[url]);
  const domain=preview?.domain||new URL(url).hostname;
  return <section className="post-link-preview" aria-label="Vista previa del enlace">
    {embed?<>
      {play&&!failed?<iframe className="post-video" src={embed.src} title={`Publicación de ${embed.provider}`} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" onError={()=>setFailed(true)}/>:<button type="button" className="video-poster" onClick={()=>{setFailed(false);setPlay(true);}} aria-label={`Reproducir contenido de ${embed.provider}`}>
        {preview?.image&&!imageFailed&&<img src={preview.image} alt="" loading="lazy" crossOrigin="anonymous" referrerPolicy="no-referrer" onError={()=>setImageFailed(true)}/>}
        <span aria-hidden="true">▶</span><strong>{preview?.title||`Ver contenido de ${embed.provider}`}</strong>
      </button>}
      <p className="embed-help">{play?'Si la plataforma bloquea la reproducción o solicita iniciar sesión, puedes abrir el enlace original.':'Pulsa para cargar el reproductor de '+embed.provider+'.'}</p>
      <a href={url} target="_blank" rel="noopener noreferrer">Abrir en {embed.provider} ↗</a>
    </>:<a className="link-preview-card" href={url} target="_blank" rel="noopener noreferrer">
      {preview?.image&&!imageFailed?<img src={preview.image} alt="" loading="lazy" crossOrigin="anonymous" referrerPolicy="no-referrer" onError={()=>setImageFailed(true)}/>:<span className="link-preview-icon" aria-hidden="true">↗</span>}
      <span><small>{domain}</small><strong>{preview?.title||domain}</strong><span>{preview?.description||'Abrir enlace externo'}</span></span>
    </a>}
  </section>;
}
