import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const applications = await prisma.membershipApplication.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        rejectionReason: true,
        plan: {
          select: {
            id: true,
            name: true,
            clubId: true,
            requiresDocumentation: true, billingMode:true,price:true,
            club: { select: { id: true, name: true,logoUrl:true } },
            documentRequirements: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                description: true,
                isRequired: true,
              },
            },
          },
        },
        documents: { where:{deletedAt:null},
          select: {
            id: true,
            requirementId: true,
            fileUrl: true,
            fileName: true, fileSizeBytes:true,mimeType:true,version:true,uploadedAt:true,reviewedAt:true,
            status: true,
            rejectionReason: true,
          },
        },
      },
    });
    return NextResponse.json({ success: true, applications:applications.map(app=>({...app,missing:app.plan.documentRequirements.filter(r=>r.isRequired&&!app.documents.some(d=>d.requirementId===r.id)).map(r=>r.id),rejected:app.documents.filter(d=>d.status==="REJECTED").map(d=>d.requirementId)})) });
  } catch (e) {
    const unauthorized = e instanceof Error && e.message === "UNAUTHORIZED";
    return NextResponse.json(
      {
        success: false,
        message: unauthorized
          ? "No autenticado"
          : "No se pudieron consultar las solicitudes",
      },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
