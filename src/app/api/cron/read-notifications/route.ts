import {prisma} from "@/lib/prisma";

export const dynamic="force-dynamic";
export async function GET(request:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret)return Response.json({success:false},{status:503});
  if(request.headers.get("authorization")!=="Bearer "+secret)
    return Response.json({success:false},{status:401});
  const {count}=await prisma.notification.deleteMany({where:{readAt:{not:null}}});
  return Response.json({success:true,deleted:count},{headers:{"Cache-Control":"no-store"}});
}
