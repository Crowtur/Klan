import {prisma} from "@/lib/prisma";
import {requireAuth} from "@/lib/auth/auth";
import {requireClubAdmin} from "@/lib/auth/authorization";

const dayMs = 86400000;
function validDate(value:string) {
  const date=new Date(value+"T00:00:00Z");
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(+date) && date.toISOString().startsWith(value);
}
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
    const [plans,activations,payments,reservations,events,settlements]=await prisma.$transaction([
      prisma.membershipPlan.findMany({where:{clubId},select:{id:true,name:true,isActive:true}}),
      prisma.subscription.findMany({where:{plan:{clubId},billingMode:"RECURRING",firstActivatedAt:range},select:{planId:true,firstActivatedAt:true}}),
      prisma.payment.findMany({where:{clubId,status:"PAID",currency:"usd",paidAt:range},select:{amount:true,paidAt:true,subscription:{select:{planId:true}}}}),
      prisma.reservation.findMany({where:{facility:{clubId},startAt:range},select:{startAt:true,status:true,facilityId:true}}),
      prisma.membershipEvent.findMany({where:{clubMembership:{clubId},occurredAt:range},select:{occurredAt:true,type:true}}),
      prisma.clubSettlement.findMany({where:{clubId},orderBy:[{year:"asc"},{month:"asc"}],select:{year:true,month:true,status:true,netAmount:true}})
    ]);
    const key=(day:string)=>unit==="month"?day.slice(0,7):day;
    const series:Record<string,{activations:Record<string,number>;incomeCents:Record<string,number>;reservations:Record<string,number>;members:Record<string,number>}>={};
    for(let t=Date.parse(start);t<=Date.parse(end);t+=dayMs){
      const k=key(new Date(t).toISOString().slice(0,10));
      series[k]??={activations:Object.fromEntries(plans.map(p=>[p.id,0])),incomeCents:Object.fromEntries(plans.map(p=>[p.id,0])),reservations:{},members:{}};
    }
    for(const s of activations)series[key(local.format(s.firstActivatedAt!))].activations[s.planId]++;
    for(const p of payments)series[key(local.format(p.paidAt!))].incomeCents[p.subscription.planId]+=p.amount.mul(100).toNumber();
    const hour=new Intl.DateTimeFormat("en-GB",{timeZone:club.timeZone,hour:"2-digit",hourCycle:"h23"});
    for(const r of reservations){const bucket=series[key(local.format(r.startAt))].reservations;const k=[r.facilityId,hour.format(r.startAt),r.status].join("/");bucket[k]=(bucket[k]??0)+1;}
    for(const e of events){const bucket=series[key(local.format(e.occurredAt))].members;bucket[e.type]=(bucket[e.type]??0)+1;}
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
