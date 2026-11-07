import {requireAuth} from "@/lib/auth/auth";
import {prisma} from "@/lib/prisma";
function fail(e:unknown) {return Response.json({success:false},{status:e instanceof Error && e.message==="UNAUTHORIZED"?401:500});}
export async function GET(req:Request) {
  try {
    const user=await requireAuth(req);
    const q=new URL(req.url).searchParams;
    const page=Number(q.get("page")??1);
    if(!Number.isSafeInteger(page)||page<1||page>10000)return Response.json({success:false},{status:400});
    const where={recipientId:user.id,...(q.get("clubId")&&{clubId:q.get("clubId")!})};
    const [notifications,total,unread,byClub]=await prisma.$transaction([
      prisma.notification.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(page-1)*25,take:25}),
      prisma.notification.count({where}),prisma.notification.count({where:{...where,readAt:null}}),
      prisma.notification.groupBy({by:["clubId","type"],orderBy:{clubId:"asc"},where:{...where,readAt:null},_count:true})
    ]);
    return Response.json({success:true,notifications,total,page,unread,byClub});
  }catch(e){return fail(e);}
}
export async function PATCH(req:Request) {
  try {
    const user=await requireAuth(req);
    const body=await req.json().catch(()=>null);
    if (body && typeof body.clubId === "string" && typeof body.tab === "string") {
      const sections = {
        applications: ["APPLICATION_SUBMITTED","DOCUMENTS_SUBMITTED"],
        reservations: ["RESERVATION_CREATED","RESERVATION_CANCELLED"],
        overview: ["SETTLEMENT_UPDATED"]
      } as const;
      if (!Object.hasOwn(sections, body.tab)) return Response.json({success:false},{status:400});
      const types = sections[body.tab as keyof typeof sections];
      const result = await prisma.notification.updateMany({
        where:{recipientId:user.id, clubId:body.clubId, readAt:null, type:{in:[...types]}},
        data:{readAt:new Date()}
      });
      return Response.json({success:true,updated:result.count});
    }
    if(typeof body?.id!=="string")return Response.json({success:false},{status:400});
    const result=await prisma.notification.updateMany({where:{id:body.id,recipientId:user.id,readAt:null},data:{readAt:new Date()}});
    return Response.json({success:true,updated:result.count});
  }catch(e){return fail(e);}
}
