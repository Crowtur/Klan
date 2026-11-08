"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {PlanCard} from "./plan-card";
import {Action,Empty,href,type Row} from "./common";

export function PublicPlans({club,plans}:{club:string;plans:Row[]}){
  const [page,setPage]=useState(0);
  const all=useRef<HTMLDialogElement>(null);
  const router=useRouter();
  const last=Math.max(0,Math.ceil(plans.length/2)-1);
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
    {last>0&&<button className="secondary" onClick={()=>all.current?.showModal()}>Todos los planes</button>}</header>
    <Empty rows={plans}/><div key={current} className="plan-pair">{plans.slice(current*2,current*2+2).map(card)}</div>
    {last>0&&<><div className="carousel-controls"><button className="secondary" aria-label="Planes anteriores" disabled={current===0} onClick={()=>setPage(current-1)}>←</button>
      <small aria-live="polite">{current+1} / {last+1}</small><button className="secondary" aria-label="Planes siguientes" disabled={current===last} onClick={()=>setPage(current+1)}>→</button></div>
      <dialog className="editor-modal all-plans" ref={all} aria-label="Todos los planes"><header><h2>Todos los planes</h2><button className="secondary" aria-label="Cerrar" onClick={()=>all.current?.close()}>×</button></header>
        <div className="all-plan-grid">{plans.map(card)}</div></dialog></>}
  </section>;
}
