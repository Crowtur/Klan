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
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {PlanCard} from "./plan-card";
import {Action,Empty,href,type Row} from "./common";

/** Muestra dos planes por página y ofrece el catálogo completo en un diálogo cuando hay más de dos. */
export function PublicPlans({club,plans}:{club:string;plans:Row[]}){
  const [page,setPage]=useState(0);
  const all=useRef<HTMLDialogElement>(null);
  const router=useRouter();
  const last=Math.max(0,Math.ceil(plans.length/2)-1);
  // Reajusta la página visible si el catálogo cambia mientras se consulta el club.
  const current=Math.min(page,last);
  function card(plan:Row){
    return <PlanCard key={plan.id} plan={plan} showRequirements>
      <Action url={`/api/clubs/${club}/membership-applications`} body={{planId:plan.id}} onDone={()=>{
        all.current?.close();
        router.push(href("applications"));
      }}>Solicitar ingreso</Action>
    </PlanCard>;
  }
  return <section className="panel public-plan-panel"><header><div><h2>Planes disponibles</h2><small>{plans.length} activos</small></div>
    {last>0&&<div className="carousel-controls"><button className="secondary" aria-label="Planes anteriores" disabled={current===0} onClick={()=>setPage(current-1)}>←</button>
      <small aria-live="polite">{current+1} / {last+1}</small><button className="secondary" aria-label="Planes siguientes" disabled={current===last} onClick={()=>setPage(current+1)}>→</button></div>}</header>
    <Empty rows={plans}/><div key={current} className="plan-pair">{plans.slice(current*2,current*2+2).map(card)}</div>
    {last>0&&<><button className="secondary" onClick={()=>all.current?.showModal()}>Todos los planes</button>
      <dialog className="editor-modal all-plans" ref={all} aria-label="Todos los planes"><header><h2>Todos los planes</h2><button className="secondary" aria-label="Cerrar" onClick={()=>all.current?.close()}>×</button></header>
        <div className="bounded-cards all-plan-grid">{plans.map(card)}</div></dialog></>}
  </section>;
}
