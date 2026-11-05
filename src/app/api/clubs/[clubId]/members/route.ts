import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

// GET: Obtener catálogo de miembros del club
// Solo CLUB_ADMIN puede acceder
export async function GET(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { clubId } = await context.params;

    await requireClubAdmin(user.id, clubId);

    const memberships = await prisma.clubMembership.findMany({
      where: {
        clubId,
      },
      include: {
        subscriptions:{where:{startedAt:{lte:new Date()},OR:[{status:"ACTIVE",expiresAt:{gt:new Date()}},{status:"PENDING_PAYMENT",gracePeriodEndsAt:{gt:new Date()}}]},select:{expiresAt:true,plan:{select:{id:true,name:true}}}},
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,avatarUrl:true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    const members = memberships.map((membership) => ({
      membershipId: membership.id,
      user: membership.user,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt,plans:membership.subscriptions,finishedAt:membership.finishedAt,removedAt:membership.removedAt,
    }));

    return NextResponse.json({
      success: true,
      members,
    });
  } catch (error) {
    console.error("Get club members error:", error);

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          {
            success: false,
            message: "No autenticado",
          },
          { status: 401 }
        );
      }

      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          {
            success: false,
            message: "No tienes permisos para ver los miembros de este club",
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}