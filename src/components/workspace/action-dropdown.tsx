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
import {useEffect,useId,useRef,useState,type ReactNode} from "react";

/** Controla la apertura y el cierre por teclado, foco o pulsación exterior y devuelve el foco al disparador. */
export function ActionDropdown({label,compact=false,children}:{
  label:string;compact?:boolean;children:(close:()=>void)=>ReactNode;
}){
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const id=useId();
  useEffect(()=>{
    if(!open)return;
    function outside(event:Event){
      if(event.target instanceof Node && !root.current?.contains(event.target))setOpen(false);
    }
    function escape(event:KeyboardEvent){
      if(event.key==="Escape"){setOpen(false);trigger.current?.focus();}
    }
    document.addEventListener("pointerdown",outside);
    document.addEventListener("focusin",outside);
    document.addEventListener("keydown",escape);
    return ()=>{
      document.removeEventListener("pointerdown",outside);
      document.removeEventListener("focusin",outside);
      document.removeEventListener("keydown",escape);
    };
  },[open]);
  function close(){setOpen(false);trigger.current?.focus();}
  return <div ref={root} className="action-dropdown">
    <button ref={trigger} type="button" className={compact?"post-options":"visit-club"} aria-label={label}
      aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(value=>!value)}>
      {compact?<svg width="15" height="15" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">{[3,9,15].map(x=><circle key={x} cx={x} cy="9" r="1.5"/>)}</svg>:<>{label} <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m3 6 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></>}
    </button>
    {open&&<div className="dropdown-options" id={id}>{children(close)}</div>}
  </div>;
}
