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
import {useEffect,useRef,useState,type FormEvent} from "react";
import {passwordChangeError} from "@/lib/auth/password-change";
import s from "./basic.module.css";

export function PasswordDialog({onClose}:{onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
  useEffect(()=>{dialog.current?.showModal();},[]);

  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form=event.currentTarget;
    const data=new FormData(form);
    const input={
      currentPassword:String(data.get("currentPassword")??""),
      newPassword:String(data.get("newPassword")??""),
      confirmation:String(data.get("confirmation")??""),
    };
    const message=passwordChangeError(input);
    if (message) {setError(message);return;}
    setError("");setBusy(true);
    try {
      const response=await fetch("/api/me/password",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
      const result=await response.json();
      if (!response.ok) {setError(result.message);return;}
      // Las claves sólo viven en los inputs. Al guardar se limpian y se desmonta el formulario.
      form.reset();setSuccess(result.message);
    } catch {setError("No se pudo confirmar el cambio. Comprueba tu conexión.");}
    finally {setBusy(false);}
  }

  return <dialog ref={dialog} className={s.passwordDialog} aria-labelledby="password-heading"
    onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <div className={s.passwordHeading}><h2 id="password-heading">Cambiar contraseña</h2>
      <button type="button" aria-label="Cerrar" disabled={busy} onClick={onClose}>×</button></div>
    {success ? <p role="status">{success}</p> :
      <form onSubmit={save} className={s.form} aria-busy={busy}>
        {([["currentPassword","Contraseña actual"],["newPassword","Nueva contraseña"],["confirmation","Confirmar nueva contraseña"]] as const).map(([name,label])=>
          <label key={name} className={s.field}>{label}
            <input className={s.input} type="password" autoComplete={name==="currentPassword"?"current-password":"new-password"} name={name} required disabled={busy}/>
          </label>)}
        {error&&<p role="alert" className={s.error}>{error}</p>}
        <button type="submit" className={s.button} disabled={busy}>{busy?"Guardando…":"Guardar cambio"}</button>
      </form>}
  </dialog>;
}
