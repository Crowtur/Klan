"use client";
import { useRef,useState } from "react";
import {Pie} from "./activity";
import {Form,api,useData,Status,type Row} from "./common";

const bankLabels = {beneficiary:"Nombre completo del beneficiario",identity:"Número de cédula / RUC / pasaporte",bankName:"Nombre del banco",accountType:"Tipo de cuenta",accountNumber:"Número de cuenta"};
export function ClubBankForm({club}:{club:string}){
  const [open,setOpen]=useState(false);
  return <details className="panel finance-disclosure" onToggle={e=>setOpen(e.currentTarget.open)}><summary>Datos bancarios del club</summary>
    {open&&<BankEditor key={club} club={club}/>}</details>;
}
function BankEditor({club}:{club:string}){
  const url=`/api/clubs/${club}/bank`;
  const state=useData(url);
  return <div><p>Los administradores de este club y el superadministrador pueden consultar estos datos para gestionar las liquidaciones.</p>
    <Status state={state}><Form method="PUT" url={url} initial={state.data?.details||{}} fields={[
      {name:"beneficiary",label:bankLabels.beneficiary,required:true,max:160},
      {name:"identity",label:bankLabels.identity,required:true,max:40},
      {name:"bankName",label:bankLabels.bankName,required:true,max:120},
      {name:"accountType",label:bankLabels.accountType,options:[{value:"AHORROS",label:"Ahorros"},{value:"CORRIENTE",label:"Corriente"}]},
      {name:"accountNumber",label:bankLabels.accountNumber,required:true,max:40}
    ]}/></Status></div>;
}
export function BankDetails({data}:{data:Row|null}){
  const [feedback,setFeedback]=useState("");
  return <details className="panel finance-disclosure"><summary>Datos bancarios</summary><div>{data?<dl className="bank-values">{Object.entries(bankLabels).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{key==="accountType"?(data[key]==="AHORROS"?"Ahorros":"Corriente"):data[key]}{["identity","accountNumber"].includes(key)&&<button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(data[key]);setFeedback("Copiado")}catch{setFeedback("Selecciona el número para copiarlo.")}}}>Copiar</button>}</dd></div>)}</dl>:<p className="notice">El administrador aún no ha registrado datos</p>}<span role="status">{feedback}</span></div></details>;
}
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
export function FinanceChart({clubs}:{clubs:Row[]}){
 const [chosen,choose]=useState<string[]|null>(null),[draft,setDraft]=useState<string[]>([]),[search,setSearch]=useState("");
 const dialog=useRef<HTMLDialogElement>(null);
 const top=[...clubs].sort((a,b)=>Number(b.grossRevenue)-Number(a.grossRevenue)).slice(0,5).map(c=>c.clubId);
 const selected=chosen??top;
 return <div className="finance-chart"><button className="secondary filter-trigger" onClick={()=>{setDraft([...selected]);setSearch("");dialog.current?.showModal()}}>☷ Seleccionar clubes</button>
 <Pie title="Finanzas · ingresos por club (USD)" values={clubs.filter(c=>selected.includes(c.clubId)).map(c=>({label:c.clubName,value:Number(c.grossRevenue)}))}/>
 <dialog ref={dialog} className="editor-modal filter-modal"><h2>Seleccionar clubes</h2><input type="search" aria-label="Buscar club" placeholder="Buscar club..." value={search} onChange={e=>setSearch(e.target.value)}/>
 <div className="actions"><button className="secondary" onClick={()=>setDraft(clubs.map(c=>c.clubId))}>Seleccionar todos</button><button className="secondary" onClick={()=>setDraft([])}>Desmarcar todos</button></div>
 <div className="filter-list">{clubs.filter(c=>c.clubName.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).map(c=><label key={c.clubId}><input type="checkbox" checked={draft.includes(c.clubId)} onChange={e=>setDraft(e.target.checked?[...draft,c.clubId]:draft.filter(id=>id!==c.clubId))}/>{c.clubName}</label>)}</div>
 <footer className="actions"><button className="secondary" onClick={()=>dialog.current?.close()}>Cancelar</button><button onClick={()=>{choose(draft);dialog.current?.close()}}>Aplicar</button></footer></dialog></div>
}
