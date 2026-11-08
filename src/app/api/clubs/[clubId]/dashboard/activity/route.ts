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

import {activeMembershipsAt} from "@/lib/membership-history";
import {prisma} from "@/lib/prisma";
import {requireAuth} from "@/lib/auth/auth";
import {requireClubAdmin} from "@/lib/auth/authorization";

const dayMs = 86400000;
function validDate(value:string) {
  const date=new Date(value+"T00:00:00Z");
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(+date) && date.toISOString().startsWith(value);
}
/** Acota los eventos al club y al intervalo solicitado para construir la gráfica de actividad. */
export async function GET(req:Request,ctx:{params:Promise<{clubId:string}>}) {
  try {
    const {clubId}=await ctx.params;
    const user=await requireAuth(req);
    const {club}=await requireClubAdmin(user.id,clubId);
    const q=new URL(req.url).searchParams;
    const local=new Intl.DateTimeFormat("en-CA",{timeZone:club.timeZone,year:"numeric",month:"2-digit",day:"2-digit"});
    const end=q.get("end")??local.format(new Date());
    const start=q.get("start")??end.slice(0,7)+"-01";
    if(!validDate(start)||!validDate(end)||start>end||Date.parse(end)-Date.parse(start)>3660*dayMs)return Response.json({error:"Rango de fechas inválido"},{status:400});
    const unit=q.get("group")??(Date.parse(end)-Date.parse(start)<32*dayMs?"day":"month");
    if(unit!=="day"&&unit!=="month")return Response.json({error:"Agrupación inválida"},{status:400});
    const [bounds]=await prisma.$queryRaw<{since:Date;until:Date}[]>`SELECT (${start}::date::timestamp AT TIME ZONE ${club.timeZone}) AS since, ((${end}::date+1)::timestamp AT TIME ZONE ${club.timeZone}) AS until`;
    const range={gte:bounds.since,lt:bounds.until};
    const [plans,activations,payments,reservations,events,settlements,memberHistory]=await prisma.$transaction([
      prisma.membershipPlan.findMany({where:{clubId},select:{id:true,name:true,isActive:true}}),
      prisma.subscription.findMany({where:{plan:{clubId},billingMode:"RECURRING",firstActivatedAt:range},select:{planId:true,firstActivatedAt:true}}),
      prisma.payment.findMany({where:{clubId,status:"PAID",currency:"usd",paidAt:range},select:{amount:true,paidAt:true,subscription:{select:{planId:true}}}}),
      prisma.reservation.findMany({where:{facility:{clubId},startAt:range},select:{startAt:true,status:true,facilityId:true}}),
      prisma.membershipEvent.findMany({where:{clubMembership:{clubId},occurredAt:range},select:{occurredAt:true,type:true}}),
      prisma.clubSettlement.findMany({where:{clubId},orderBy:[{year:"asc"},{month:"asc"}],select:{year:true,month:true,status:true,netAmount:true}}),
      prisma.clubMembership.findMany({where:{clubId,joinedAt:{lt:bounds.until}},select:{joinedAt:true,removedAt:true,finishedAt:true,status:true,role:true,subscriptions:{select:{startedAt:true,firstActivatedAt:true,expiresAt:true,gracePeriodEndsAt:true,finishedAt:true}},events:{orderBy:{occurredAt:"asc"},select:{occurredAt:true,newStatus:true,previousStatus:true,newRole:true,previousRole:true}}}})
    ]);
    const key=(day:string)=>unit==="month"?day.slice(0,7):day;
    const series:Record<string,{activations:Record<string,number>;incomeCents:Record<string,number>;reservations:Record<string,number>;members:Record<string,number>;activeMembers:number}>={};
    for(let t=Date.parse(start);t<=Date.parse(end);t+=dayMs){
      const k=key(new Date(t).toISOString().slice(0,10));
      series[k]??={activations:Object.fromEntries(plans.map(p=>[p.id,0])),incomeCents:Object.fromEntries(plans.map(p=>[p.id,0])),reservations:{},members:{},activeMembers:0};
    }
    for(const s of activations)series[key(local.format(s.firstActivatedAt!))].activations[s.planId]++;
    for(const p of payments)series[key(local.format(p.paidAt!))].incomeCents[p.subscription.planId]+=p.amount.mul(100).toNumber();
    const hour=new Intl.DateTimeFormat("en-GB",{timeZone:club.timeZone,hour:"2-digit",hourCycle:"h23"});
    for(const r of reservations){const bucket=series[key(local.format(r.startAt))].reservations;const k=[r.facilityId,hour.format(r.startAt),r.status].join("/");bucket[k]=(bucket[k]??0)+1;}
    for(const e of events){const bucket=series[key(local.format(e.occurredAt))].members;bucket[e.type]=(bucket[e.type]??0)+1;}
    const bucketDays=Object.keys(series).map(k=>unit==="day"?k:new Date(Date.UTC(Number(k.slice(0,4)),Number(k.slice(5,7)),0)).toISOString().slice(0,10)).map(day=>day>end?end:day);
    const cutoffs=await prisma.$queryRaw<{day:string;cutoff:Date}[]>`SELECT day::text AS day, ((day::date+1)::timestamp AT TIME ZONE ${club.timeZone}) AS cutoff FROM unnest(${bucketDays}::text[]) AS day`;
    const now=new Date();Object.keys(series).forEach((k,i)=>{const cutoff=cutoffs.find(c=>c.day===bucketDays[i])!.cutoff;series[k].activeMembers=activeMembershipsAt(memberHistory,cutoff>now?now:cutoff);});
    const monthlySettlements=[];
    const firstMonth=local.format(club.createdAt).slice(0,7)+"-01";
    const lastMonth=local.format(new Date()).slice(0,7)+"-01";
    for(const month=new Date(firstMonth+"T00:00:00Z");month.toISOString().slice(0,10)<=lastMonth;month.setUTCMonth(month.getUTCMonth()+1)){
      const year=month.getUTCFullYear(),m=month.getUTCMonth()+1;
      monthlySettlements.push(settlements.find(s=>s.year===year&&s.month===m)??{year,month:m,status:null,netAmount:"0.00"});
    }
    return Response.json({success:true,start,end,unit,timeZone:club.timeZone,currency:"USD",plans,series,settlements:monthlySettlements});
  } catch(e){const code=e instanceof Error?e.message:"";return Response.json({success:false},{status:code==="UNAUTHORIZED"?401:code==="FORBIDDEN"?403:500});}
}
