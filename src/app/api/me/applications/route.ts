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
            requiresDocumentation: true,
            club: { select: { id: true, name: true } },
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
        documents: {
          select: {
            id: true,
            requirementId: true,
            fileUrl: true,
            fileName: true,
            status: true,
            rejectionReason: true,
          },
        },
      },
    });
    return NextResponse.json({ success: true, applications });
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
