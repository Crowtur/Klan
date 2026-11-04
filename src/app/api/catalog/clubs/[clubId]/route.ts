import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
// Public projection: active club and active plans only. Never exposes members or finances.
export async function GET(
  _request: Request,
  context: { params: Promise<{ clubId: string }> },
) {
  try {
    const { clubId } = await context.params;
    const club = await prisma.club.findFirst({
      where: { id: clubId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,address:true,googleMapsUrl:true,coverUrl:true,
      },
    });
    if (!club)
      return NextResponse.json(
        { success: false, message: "Club no disponible" },
        { status: 404 },
      );
    const plans = await prisma.membershipPlan.findMany({
      where: { clubId, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        price: true,
        durationValue: true,
        durationUnit: true,billingMode:true,
        requiresDocumentation: true,
        benefits: true,
        documentRequirements: {
          where: { isActive: true },
          select: { id: true, name: true, description: true, isRequired: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ success: true, club, plans });
  } catch {
    return NextResponse.json(
      { success: false, message: "No se pudo consultar el club" },
      { status: 500 },
    );
  }
}
