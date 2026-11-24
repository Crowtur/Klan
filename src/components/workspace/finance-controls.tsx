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
import { useRef,useState } from "react";
import {Pie} from "./activity";
import {Form,api,useData,Status,type Row} from "./common";

const bankLabels = {beneficiary:"Nombre completo del beneficiario",identity:"Número de cédula / RUC / pasaporte",bankName:"Nombre del banco",accountType:"Tipo de cuenta",accountNumber:"Número de cuenta"};
/** Solicita los datos bancarios al abrir el editor autorizado para mostrar la versión guardada. */
export function EntityBankForm({entity}:{entity:string}){
  const [open,setOpen]=useState(false);
  return <details className="panel finance-disclosure" onToggle={e=>setOpen(e.currentTarget.open)}><summary>Datos bancarios de la entidad</summary>
    {open&&<BankEditor key={entity} entity={entity}/>}</details>;
}
/** Inicializa el formulario con los datos consultados y los actualiza mediante la ruta privada de la entidad. */
function BankEditor({entity}:{entity:string}){
  const url=`/api/entities/${entity}/bank`;
  const state=useData(url);
  return <div><p>Los administradores de esta entidad y el superadministrador pueden consultar estos datos para gestionar las liquidaciones.</p>
    <Status state={state}><Form method="PUT" url={url} initial={state.data?.details||{}} fields={[
      {name:"beneficiary",label:bankLabels.beneficiary,required:true,max:160},
      {name:"identity",label:bankLabels.identity,required:true,max:40},
      {name:"bankName",label:bankLabels.bankName,required:true,max:120},
      {name:"accountType",label:bankLabels.accountType,options:[{value:"AHORROS",label:"Ahorros"},{value:"CORRIENTE",label:"Corriente"}]},
      {name:"accountNumber",label:bankLabels.accountNumber,required:true,max:40}
    ]}/></Status></div>;
}
/** Presenta los datos bancarios recibidos y permite copiar los valores que se usan en una transferencia. */
export function BankDetails({data}:{data:Row|null}){
  const [feedback,setFeedback]=useState("");
  return <details className="panel finance-disclosure"><summary>Datos bancarios</summary><div>{data?<dl className="bank-values">{Object.entries(bankLabels).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{key==="accountType"?(data[key]==="AHORROS"?"Ahorros":"Corriente"):data[key]}{["identity","accountNumber"].includes(key)&&<button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(data[key]);setFeedback("Copiado")}catch{setFeedback("Selecciona el número para copiarlo.")}}}>Copiar</button>}</dd></div>)}</dl>:<p className="notice">El administrador aún no ha registrado datos</p>}<span role="status">{feedback}</span></div></details>;
}
/** Restringe las transiciones ofrecidas al estado actual y recoge la referencia del pago. */
export function SettlementForm({settlement:s,onDone}:{settlement:Row;onDone:()=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 if(!["PENDING","PROCESSING"].includes(s.status))return null;
 return <form className="panel settlement-form" onSubmit={async e=>{
   e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);setMessage("");
   try{await api("/api/admin/settlements/"+s.id,"PATCH",values);onDone()}catch(error){setMessage((error as Error).message)}finally{setBusy(false)}
 }}><div className="settlement-row"><label>Estado<select name="status">{s.status==="PENDING"&&<option value="PROCESSING">En proceso</option>}<option value="PAID">Pagada</option></select></label>
 <label>Referencia del pago<input name="paymentReference" defaultValue={s.paymentReference||""}/></label></div>
 <details className="finance-disclosure"><summary>+ Agregar notas</summary><label>Notas<textarea name="notes" defaultValue={s.notes||""}/></label></details><small>(Opcional)</small>
 <button disabled={busy}>{busy?"Guardando…":"Guardar"}</button>{message&&<p role="alert">{message}</p>}</form>;
}
/** Mantiene una selección provisional de entidades hasta aplicar el filtro de la gráfica. */
export function FinanceChart({entities}:{entities:Row[]}){
 const [chosen,choose]=useState<string[]|null>(null),[draft,setDraft]=useState<string[]>([]),[search,setSearch]=useState("");
 const dialog=useRef<HTMLDialogElement>(null);
 const top=[...entities].sort((a,b)=>Number(b.grossRevenue)-Number(a.grossRevenue)).slice(0,5).map(c=>c.entityId);
 const selected=chosen??top;
 return <div className="finance-chart"><button className="secondary filter-trigger" onClick={()=>{setDraft([...selected]);setSearch("");dialog.current?.showModal()}}>☷ Seleccionar entidades</button>
 <Pie title="Finanzas · ingresos por entidad (USD)" values={entities.filter(c=>selected.includes(c.entityId)).map(c=>({label:c.entityName,value:Number(c.grossRevenue)}))}/>
 <dialog ref={dialog} className="editor-modal filter-modal"><h2>Seleccionar entidades</h2><input type="search" aria-label="Buscar entidad" placeholder="Buscar entidad..." value={search} onChange={e=>setSearch(e.target.value)}/>
 <div className="actions"><button className="secondary" onClick={()=>setDraft(entities.map(c=>c.entityId))}>Seleccionar todos</button><button className="secondary" onClick={()=>setDraft([])}>Desmarcar todos</button></div>
 <div className="filter-list">{entities.filter(c=>c.entityName.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).map(c=><label key={c.entityId}><input type="checkbox" checked={draft.includes(c.entityId)} onChange={e=>setDraft(e.target.checked?[...draft,c.entityId]:draft.filter(id=>id!==c.entityId))}/>{c.entityName}</label>)}</div>
 <footer className="actions"><button className="outline-destructive" onClick={()=>dialog.current?.close()}>Cancelar</button><button onClick={()=>{choose(draft);dialog.current?.close()}}>Aplicar</button></footer></dialog></div>
}
