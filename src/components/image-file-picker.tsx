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
import {ImageCropDialog} from "./image-crop-dialog";
import {Icon} from "./ui";
/** Reutiliza selección, arrastre, formatos y recorte; la persistencia permanece en el uploader autorizado de cada contexto. */
export function ImageFilePicker({onFile,maxMB=4,aspect,compact=false,label='Arrastra una imagen o haz clic para elegir',button='Elegir imagen',className,allowPdf=false}:{onFile:(file:File)=>Promise<void>;maxMB?:number;aspect?:number;compact?:boolean;label?:string;button?:string;className?:string;allowPdf?:boolean}) {
  const input=useRef<HTMLInputElement>(null),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[drag,setDrag]=useState(false);
  async function upload(next:File){setFile(null);setBusy(true);setMessage('Subiendo archivo…');try{await onFile(next);setMessage('Archivo guardado.');}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}}
  function choose(next?:File){
    if(!next||busy)return;setMessage('');
    if(allowPdf&&next.type==='application/pdf'){if(next.size>maxMB*1024*1024){setMessage(`El PDF no puede superar ${maxMB} MB.`);return;}void upload(next);return;}
    if(!next.type.startsWith('image/')){setMessage('Selecciona una imagen'+(allowPdf?' o un PDF.':'.'));return;}
    if(next.size>32*1024*1024){setMessage('La imagen original no puede superar 32 MB.');return;}
    setFile(next);
  }
  const formats=<small>{allowPdf?'PDF · ':''}Se admiten todos los formatos de imagen<br/>Máximo {maxMB} MB después del recorte</small>;
  return <div className={compact?'image-picker-compact':'image-picker'} aria-busy={busy}>
    <div className={compact?undefined:drag?'file-drop dragging':'file-drop'} onDragOver={event=>{if(!compact){event.preventDefault();setDrag(true);}}} onDragLeave={()=>setDrag(false)} onDrop={event=>{if(!compact){event.preventDefault();setDrag(false);choose(event.dataTransfer.files[0]);}}}>
      {!compact&&<><Icon name="camera" size={28}/><strong>{label}</strong></>}
      <button type="button" className={className||'secondary'} disabled={busy} onClick={()=>input.current?.click()}>{compact&&<Icon name="camera"/>}{busy?'Subiendo…':button}</button>{!compact&&formats}
      <input ref={input} type="file" hidden accept={allowPdf?'image/*,application/pdf':'image/*'} onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/>
    </div>{message&&<p role="status">{message}</p>}{file&&<ImageCropDialog file={file} aspect={aspect} maxBytes={maxMB*1024*1024} onCancel={()=>setFile(null)} onConfirm={next=>void upload(next)}/>}
  </div>;
}
