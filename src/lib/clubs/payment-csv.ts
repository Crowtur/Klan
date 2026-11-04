import {Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
export async function paymentCsv(where:Prisma.PaymentWhereInput){
  const rows=await prisma.payment.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],select:{id:true,createdAt:true,paidAt:true,amount:true,currency:true,status:true,club:{select:{name:true}},subscription:{select:{planNameSnapshot:true,plan:{select:{name:true}}}}}});
  function escape(value:string){return '"'+(/^[\s]*[=+@-]/.test(value)?"'":"")+value.replaceAll('"','""')+'"';}
  const data=rows.map(r=>[r.id,r.club.name,r.subscription.planNameSnapshot??r.subscription.plan.name,r.amount.toFixed(2),r.currency,r.status,r.createdAt.toISOString(),r.paidAt?.toISOString()??""]);
  return new Response("\uFEFF"+[["ID","Club","Plan","Importe","Moneda","Estado","Creación","Pago"],...data].map(row=>row.map(escape).join(",")).join("\r\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="pagos.csv"',"Cache-Control":"private, no-store"}});
}
