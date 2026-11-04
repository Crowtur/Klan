import {prisma} from "@/lib/prisma";
import {requireAuth} from "@/lib/auth/auth";
export async function POST(req:Request,ctx:{params:Promise<{applicationId:string;clubId:string}>}){
  try{
    const user=await requireAuth(req);
    const {applicationId,clubId}=await ctx.params;
    return await prisma.$transaction(async tx=>{
      const app=await tx.membershipApplication.findFirst({where:{id:applicationId,userId:user.id,plan:{clubId,club:{status:"ACTIVE"}}},include:{plan:{include:{documentRequirements:{where:{isActive:true,isRequired:true}}}},documents:{where:{deletedAt:null}}}});
      if(!app)return Response.json({success:false},{status:404});
      if(!["PENDING","DOCUMENTATION_REVIEW"].includes(app.status))return Response.json({success:false},{status:409});
      const missing=app.plan.documentRequirements.filter(r=>!app.documents.some(d=>d.requirementId===r.id&&d.status!=="REJECTED")).map(r=>r.id);
      if(missing.length)return Response.json({success:false,missing},{status:409});
      await tx.membershipApplication.update({where:{id:app.id,status:app.status},data:{status:"DOCUMENTATION_REVIEW"}});
      const admins=await tx.clubMembership.findMany({where:{clubId,role:"CLUB_ADMIN",status:"ACTIVE"},select:{userId:true}});
      const eventKey="submitted:"+app.id+":"+app.documents.map(d=>d.id+"."+d.version).sort().join(",");
      await tx.notification.createMany({data:admins.map(m=>({clubId,recipientId:m.userId,type:"DOCUMENTS_SUBMITTED",eventKey,title:"Documentación enviada",entityType:"application",entityId:app.id,targetPath:"/app?view=club&club="+clubId})),skipDuplicates:true});
      return Response.json({success:true,status:"DOCUMENTATION_REVIEW"});
    },{isolationLevel:"Serializable"});
  }catch(e){return Response.json({success:false},{status:e instanceof Error&&e.message==="UNAUTHORIZED"?401:500});}
}
