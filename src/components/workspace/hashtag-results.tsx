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
import {useState} from "react";
import Link from "next/link";
import {useData,Status,Pager,type Row} from "./common";
import {PostCard} from "./post-card";
/** Mantiene el círculo de origen al alternar el alcance y reinicia la paginación de cada búsqueda. */
export function HashtagResults({tag,entityId,returnHref}:{tag:string;entityId:string;returnHref:string}) {
  const [global,setGlobal]=useState(false),[page,setPage]=useState(1);
  const state=useData('/api/posts/hashtags?'+new URLSearchParams({tag,entityId,scope:global?'all':'entity',page:String(page),limit:'10'}));
  return <section className="hashtag-results"><h1>Publicaciones con #{tag}</h1>
    <p>{global?'Resultados de todos los círculos de Klan':`Resultados de ${state.data?.origin?.name||'este círculo'}`}</p>
    <Link className="btn btn-outline" href={returnHref}>Volver al círculo de origen</Link>
    <label className="hashtag-scope"><input type="checkbox" checked={global} onChange={e=>{setGlobal(e.target.checked);setPage(1);}}/> Ver publicaciones de todos los círculos</label>
    <Status state={state}>{!state.data?.posts?.length?<p className="empty-state">No hay publicaciones con esta etiqueta en el alcance seleccionado.</p>:state.data.posts.map((post:Row)=><PostCard key={post.id} post={post}/>)}<Pager data={state.data} page={page} onPage={setPage}/></Status>
  </section>;
}
