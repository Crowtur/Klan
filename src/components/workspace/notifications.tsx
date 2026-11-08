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
import {useRouter,usePathname,useSearchParams} from "next/navigation";
import {api,type Row} from "./common";
import {notificationDestination,notificationTitle,relativeTime} from "@/lib/notification-routing";
/** Actualiza los avisos al cambiar de página, periódicamente o tras una lectura, y abre el destino del aviso seleccionado. */
export function Notifications(){
 const [data,setData]=useState<Row>({notifications:[]}),[open,setOpen]=useState(false),[error,setError]=useState(""),[page,setPage]=useState(1),[,tick]=useState(0);
 const box=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),router=useRouter(),path=usePathname(),query=useSearchParams().toString();
 useEffect(()=>{setOpen(false)},[path,query]);
 useEffect(()=>{const outside=(e:PointerEvent)=>{if(!box.current?.contains(e.target as Node))setOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){setOpen(false);trigger.current?.focus()}};document.addEventListener("pointerdown",outside);document.addEventListener("keydown",key);return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",key)}},[]);
 useEffect(()=>{let live=true;const refresh=()=>api(`/api/me/notifications?page=${page}`).then(d=>{if(live){setData(d);tick(n=>n+1)}}).catch(()=>{});void refresh();const timer=setInterval(refresh,30000);window.addEventListener("klubo-notifications",refresh);return()=>{live=false;clearInterval(timer);window.removeEventListener("klubo-notifications",refresh)}},[page]);
 return <div className="notification-box" ref={box}><button className="notification-trigger" ref={trigger} aria-label="Notificaciones" aria-expanded={open} onClick={()=>setOpen(!open)}><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 20a2 2 0 0 0 4 0"/></svg>{data.unread>0&&<b className="notification-count">{data.unread}</b>}</button>{open&&<section className="notification-list" aria-label="Notificaciones"><h3>Tus novedades</h3>{error&&<p role="alert">{error}</p>}{!data.notifications.length&&<p>Estás al día.</p>}{data.notifications.map((n:Row)=><button key={n.id} className={n.readAt?"notification-item":"notification-item unread"} onClick={async()=>{try{await api("/api/me/notifications","PATCH",{id:n.id});window.dispatchEvent(new Event("klubo-notifications"));setOpen(false);router.push(notificationDestination(n as any).path)}catch(e){setError((e as Error).message)}}}><strong>{notificationTitle(n as any)}</strong>{n.message&&<span>{n.message}</span>}<small>{relativeTime(n.createdAt)}</small></button>)}<div className="notification-pages"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>{page}</span><button disabled={page*25>=data.total} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div></section>}</div>
}
