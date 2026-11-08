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
import {Icon} from "@/components/ui";
import {api,useData,Status,Form,Action,type Row,requirementFields} from "./common";
/** Coordina el plan desplegado con el requisito que se está creando o editando. */
export function Requirements({club,plans,onChanged}:{club:string;plans:Row[];onChanged:()=>void}){
 const [opened,setOpened]=useState<string|null>(null),[editing,setEditing]=useState<{plan:Row;requirement:Row}|null>(null),[version,setVersion]=useState(0);
 const base=`/api/clubs/${club}/membership-plans`;
 return <section className="requirements-section"><h2>Requisitos documentales</h2><p className="muted">Gestiona los documentos que se solicitan antes de aprobar una membresía.</p><div className={editing?"requirements-layout editing":"requirements-layout"}><div>{plans.map(plan=><RequirementGroup key={plan.id} plan={plan} base={`${base}/${plan.id}/document-requirements`} open={opened===plan.id} version={version} onToggle={()=>{setOpened(opened===plan.id?null:plan.id);setEditing(null)}} onEdit={requirement=>setEditing({plan,requirement})}/>)}</div>{editing&&<aside className="panel requirement-editor"><h3>{editing.requirement.id?"Editar requisito":"Crear requisito"}</h3><p className="muted">Plan {editing.plan.name}</p><RequirementForm key={editing.plan.id+(editing.requirement.id||"new")} initial={editing.requirement} url={`${base}/${editing.plan.id}/document-requirements${editing.requirement.id?"/"+editing.requirement.id:""}`} onCancel={()=>setEditing(null)} onDone={()=>{setVersion(v=>v+1);setEditing(null);onChanged()}}/>{editing.requirement.id&&editing.requirement.isActive!==false&&<Action method="DELETE" url={`${base}/${editing.plan.id}/document-requirements/${editing.requirement.id}`} confirm="¿Desactivar este requisito?" onDone={()=>{setVersion(v=>v+1);setEditing(null);onChanged()}}>Desactivar requisito</Action>}</aside>}</div></section>
}
/** Agrupa los requisitos de un plan y permite elegir uno para su edición. */
function RequirementGroup({plan,base,open,version,onToggle,onEdit}:{plan:Row;base:string;open:boolean;version:number;onToggle:()=>void;onEdit:(r:Row)=>void}){
 const state=useData(open ? base : null,version),rows:Row[]=(open && state.data?.requirements) || plan.documentRequirements || [];
 return <section className={open?"requirement-group expanded":"requirement-group"}><button className="requirement-toggle" aria-expanded={open} aria-controls={"requirements-"+plan.id} onClick={onToggle}><span><Icon name="chevron" size={17}/>{plan.name}</span><small>{rows.filter(r=>r.isActive!==false).length} requisitos · {rows.filter(r=>r.isActive!==false&&r.isRequired).length} obligatorios</small></button>{open&&<div id={"requirements-"+plan.id}><Status state={state}>{!rows.length&&<p className="requirement-empty">Este plan todavía no tiene requisitos.</p>}{rows.map(r=><div className="requirement-row" key={r.id}><Icon name="document"/><div><strong>{r.name}</strong><p>{r.description||"Sin instrucciones adicionales."}</p><small>{r.isActive===false?"Desactivado":r.isRequired?"✓ Obligatorio":"Opcional"}</small></div><button className="secondary" onClick={()=>onEdit(r)}>Editar</button></div>)}<button className="requirement-create" onClick={()=>onEdit({isRequired:true})}>+ Crear requisito para {plan.name}</button></Status></div>}</section>
}

/** Envía un alta o modificación según exista identificador y guarda las instrucciones y la obligatoriedad. */
function RequirementForm({initial,url,onCancel,onDone}:{initial:Row;url:string;onCancel:()=>void;onDone:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 return <form className="editor" onSubmit={async e=>{e.preventDefault();const data=new FormData(e.currentTarget);setBusy(true);setError("");try{await api(url,initial.id?"PATCH":"POST",{name:String(data.get("name")||"").trim(),description:String(data.get("description")||"").trim(),isRequired:data.has("isRequired")});onDone()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}><fieldset disabled={busy}><label>Nombre del requisito<input name="name" required defaultValue={initial.name||""}/></label><label>Instrucciones para el socio<textarea name="description" defaultValue={initial.description||""}/></label><label className="checkbox-line"><input type="checkbox" name="isRequired" defaultChecked={initial.isRequired!==false}/>Obligatorio</label></fieldset><p className="muted">Formato admitido: PDF · Tamaño máximo: 8 MB. El socio debe adjuntarlo para enviar su solicitud si es obligatorio.</p>{error&&<p role="alert">{error}</p>}<div className="requirement-actions"><button type="button" className="outline-destructive" onClick={onCancel} disabled={busy}>Cancelar</button><button disabled={busy}>{busy?"Guardando…":"Guardar requisito"}</button></div></form>;
}
