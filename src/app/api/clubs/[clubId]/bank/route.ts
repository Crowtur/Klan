import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";

const fields = z.object({
  beneficiary: z.string().trim().min(1).max(160),
  identity: z.string().trim().min(1).max(40),
  bankName: z.string().trim().min(1).max(120),
  accountType: z.enum(["AHORROS","CORRIENTE"]),
  accountNumber: z.string().trim().regex(/^[0-9][0-9 -]{1,38}[0-9]$/)
});
export async function PUT(request: Request, context: {params:Promise<{clubId:string}>}) {
  try {
    const user = await requireAuth(request);
    const {clubId} = await context.params;
    await requireClubAdmin(user.id,clubId);
    const result = fields.safeParse(await request.json().catch(()=>null));
    if (!result.success) return Response.json({message:"Revisa los datos del beneficiario y de la cuenta."},{status:400});
    await prisma.clubBankDetails.upsert({where:{clubId},create:{clubId,...result.data},update:result.data,select:{clubId:true}});
    return Response.json({success:true,message:"Datos bancarios guardados."});
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return Response.json({success:false},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:500});
  }
}

export async function GET(request: Request, context: {params:Promise<{clubId:string}>}) {
  try {
    const user=await requireAuth(request);
    const {clubId}=await context.params;
    await requireClubAdmin(user.id,clubId);
    const details=await prisma.clubBankDetails.findUnique({
      where:{clubId},select:{beneficiary:true,identity:true,bankName:true,accountType:true,accountNumber:true}
    });
    return Response.json({success:true,details},{headers:{"Cache-Control":"private, no-store"}});
  } catch(error) {
    const message=error instanceof Error?error.message:"";
    return Response.json({success:false},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:500});
  }
}
