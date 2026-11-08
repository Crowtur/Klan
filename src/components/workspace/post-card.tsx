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
import {AvatarImage} from "@/components/avatar-image";
import { useRef,useState } from "react";
import Link from "next/link";
import {Icon} from "@/components/ui";
import {PostComposer} from "./post-composer";
import {ActionDropdown} from "./action-dropdown";
import {api,date,safeUrl,type Row} from "./common";

/** Mantiene separadas la lectura, la edición y la confirmación de borrado. La imagen se abre completa en un diálogo. */
export function PostCard({post,admin=false,onChanged=()=>{}}:{post:Row;admin?:boolean;onChanged?:()=>void}){
  const photo=useRef<HTMLDialogElement>(null),removal=useRef<HTMLDialogElement>(null),editor=useRef<HTMLDialogElement>(null);
  const [feedback,show]=useState("");
  const [deleting,setDeleting]=useState(false),[deleteError,setDeleteError]=useState("");
  async function remove(){
    setDeleting(true);setDeleteError("");
    try{await api(`/api/clubs/${post.club.id}/posts/${post.id}`,"DELETE");removal.current?.close();onChanged();}
    catch(error){setDeleteError((error as Error).message);}
    finally{setDeleting(false);}
  }
  const url="/explore/"+encodeURIComponent(post.club.id)+"?tab=posts&post="+encodeURIComponent(post.id)+"#post-"+encodeURIComponent(post.id);
  async function share(){
    const full=new URL(url,window.location.origin).href;
    try{
      if(navigator.share)await navigator.share({title:post.title||post.club.name,url:full});
      else {await navigator.clipboard.writeText(full);show("Enlace copiado");}
    }catch(e){if(!(e instanceof Error && e.name==="AbortError"))show(full);}
  }
  return <article id={"post-"+post.id} className="feed-card club-post">
    <header className="feed-card-top"><div className="row"><span className="avatar">{safeUrl(post.club.logoUrl)?<AvatarImage src={safeUrl(post.club.logoUrl)} alt=""/>:<Icon name="users"/>}</span>
      <div><Link className="feed-club" href={"/explore/"+post.club.id}>{post.club.name}</Link><small>{date(post.createdAt)}</small></div></div>
      {admin&&<ActionDropdown label="Acciones de la publicación" compact>{close=><>
        <button type="button" onClick={()=>{close();editor.current?.showModal()}}>Editar</button>
        <button type="button" className="outline-destructive" onClick={()=>{close();setDeleteError("");removal.current?.showModal()}}>Eliminar</button>
      </>}</ActionDropdown>}
    </header><div className="feed-copy">{post.title&&<h2>{post.title}</h2>}<p>{post.content}</p></div>
    {safeUrl(post.imageUrl)&&<><button type="button" className="photo-opener" aria-label="Ver imagen completa" onClick={()=>photo.current?.showModal()}>
      <img className="feed-image" src={safeUrl(post.imageUrl)} alt={post.title||"Publicación del club"} loading="lazy"/></button>
      <dialog className="editor-modal photo-viewer" ref={photo} aria-label="Imagen completa" onClick={e=>{if(e.target===photo.current)photo.current.close()}}>
        <button type="button" className="secondary" aria-label="Cerrar imagen" onClick={()=>photo.current?.close()}>×</button>
        <img src={safeUrl(post.imageUrl)} alt={post.title||"Publicación del club"} loading="lazy"/>
      </dialog></>}
    <footer className="feed-card-bottom"><small>{post.author?.firstName} {post.author?.lastName}</small><button className="secondary" onClick={share}>Compartir ↗</button></footer>
    {feedback&&<p role="status" className="share-result">{feedback}</p>}
    {admin&&<dialog ref={removal} className="editor-modal" aria-label="Eliminar publicación">
      <h2>Eliminar publicación</h2><p>¿Eliminar esta publicación definitivamente?</p><div className="actions"><button className="outline-destructive" onClick={()=>removal.current?.close()}>Cancelar</button>
      <button className="outline-destructive" disabled={deleting} onClick={remove}>{deleting?"Eliminando…":"Eliminar"}</button></div>{deleteError&&<p role="alert">{deleteError}</p>}</dialog>}
    {admin&&<dialog ref={editor} className="editor-modal" aria-label="Editar publicación"><header><h2>Editar publicación</h2><button className="secondary" aria-label="Cerrar" onClick={()=>editor.current?.close()}>×</button></header>
      <PostComposer club={post.club.id} post={post} onDone={onChanged}/></dialog>}
  </article>;
}
