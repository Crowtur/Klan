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
import {api,type Row} from "./common";
import {notificationDestination} from "@/lib/notification-routing";
/** Obtiene el recuento de avisos correspondiente al destino de navegación. */
export function NoticeCount({club,kind}:{club?:string;kind?:"applications"|"clubs"|"reservations"|"overview"|"members"}){
 const [count,setCount]=useState(0);
 useEffect(()=>{let live=true;const refresh=()=>api("/api/me/notifications"+(club?"?clubId="+encodeURIComponent(club):"")).then(d=>{if(live)setCount((d.byClub||[]).filter((r:Row)=>{const route=notificationDestination(r as any);if(club)return route.scope==="club"&&(!kind||route.tab===kind);if(kind==="applications")return route.scope==="personal"&&route.tab==="applications";return route.scope==="club"}).reduce((n:number,r:Row)=>n+Number(r._count),0))}).catch(()=>{});void refresh();const timer=setInterval(refresh,30000);window.addEventListener("klubo-notifications",refresh);return()=>{live=false;clearInterval(timer);window.removeEventListener("klubo-notifications",refresh)}},[club,kind]);
 return count?<span className="notification-count" aria-label={count+" novedades"}>{count}</span>:null;
}
