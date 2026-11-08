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
import {useEffect,useRef,useState} from "react";
import {generateReactHelpers} from "@uploadthing/react";
import type {OurFileRouter} from "@/app/api/uploadthing/core";
import {Icon} from "@/components/ui";
import {api,safeUrl,type Row} from "./common";
const {useUploadThing}=generateReactHelpers<OurFileRouter>();
/** Coordina texto e imagen en el mismo envío. Al editar distingue conservar, sustituir y retirar la imagen. */
export function PostComposer({club,post,onDone}:{club:string;post?:Row;onDone:()=>void}){
 const [title,setTitle]=useState(post?.title||""),[content,setContent]=useState(post?.content||""),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState<string>(),[remove,setRemove]=useState(false),[drag,setDrag]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const input=useRef<HTMLInputElement>(null),form=useRef<HTMLFormElement>(null),requestKey=useRef<string>("");
 const {startUpload}=useUploadThing("postComposerUploader");
 useEffect(()=>{if(!file){setPreview(undefined);return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 function choose(next?:File){if(!next)return;if(!next.type.startsWith("image/")||next.size>4*1024*1024){setError("Elige una imagen de hasta 4 MB.");return}setError("");setFile(next);setRemove(false)}
 return <form className="post-composer" ref={form} onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{
 if(file){requestKey.current ||= crypto.randomUUID();const result=await startUpload([file],{clubId:club,postId:post?.id,requestKey:requestKey.current,title,content});if(!result?.[0]?.serverData?.persisted)throw Error("No se pudo guardar la publicación. Intenta nuevamente.")}
 else await api(`/api/clubs/${club}/posts${post?"/"+post.id:""}`,post?"PATCH":"POST",{title,content,...(remove?{removeImage:true}:{})});
 onDone();form.current?.closest("dialog")?.close();if(!post){setTitle("");setContent("")}setFile(null);requestKey.current="";
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>
 <fieldset disabled={busy}>
 <label>Título<input maxLength={150} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Contenido<textarea required maxLength={5000} value={content} onChange={e=>setContent(e.target.value)}/></label>
 {(preview||!remove&&safeUrl(post?.imageUrl))&&<img className="composer-preview" src={preview||safeUrl(post?.imageUrl)} alt="Vista previa de la publicación"/>}
 <div className={drag?"file-drop dragging":"file-drop"} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);choose(e.dataTransfer.files[0])}}><Icon name="camera" size={28}/><strong>{file?.name||"Arrastra una imagen aquí"}</strong><small>Imagen opcional · Máximo 4 MB</small><button type="button" className="secondary" onClick={()=>input.current?.click()}>Elegir imagen</button><input ref={input} type="file" hidden accept="image/*" onChange={e=>{choose(e.target.files?.[0]);e.target.value=""}}/></div>
 {(file||post?.imageUrl&&!remove)&&<button type="button" className="outline-destructive" onClick={()=>{setFile(null);setRemove(true)}}>Quitar imagen</button>}

 </fieldset>{error&&<p className="error" role="alert">{error}</p>}<div className="actions"><button disabled={busy}>{busy?"Guardando publicación…":post?"Guardar cambios":"Publicar"}</button></div>
 </form>
}
