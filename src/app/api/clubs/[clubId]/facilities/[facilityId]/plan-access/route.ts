
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      facilityId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);
    const { clubId, facilityId } = await context.params;

    const membership = await prisma.clubMembership.findFirst({
      where: {
        clubId,
        userId: user.id,
        role: "CLUB_ADMIN",
        status: "ACTIVE",
      },
    });

    if (!membership && user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "No tienes permisos para configurar los planes de esta instalación",
        },
        { status: 403 }
      );
    }

    const facility = await prisma.facility.findFirst({
      where: {
        id: facilityId,
        clubId,
      },
      select: {
        id: true,
      },
    });

    if (!facility) {
      return NextResponse.json(
        {
          success: false,
          message: "Instalación no encontrada",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (!Array.isArray(body.planAccesses)) {
      return NextResponse.json(
        {
          success: false,
          message: "El campo planAccesses debe ser un arreglo",
        },
        { status: 400 }
      );
    }

    const planIds = new Set<string>();

    for (const item of body.planAccesses) {
      if (
        typeof item.membershipPlanId !== "string" ||
        !item.membershipPlanId.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Cada acceso debe incluir un membershipPlanId válido",
          },
          { status: 400 }
        );
      }

      if (planIds.has(item.membershipPlanId)) {
        return NextResponse.json(
          {
            success: false,
            message: "No puedes repetir un plan en la configuración",
          },
          { status: 400 }
        );
      }

      planIds.add(item.membershipPlanId);

      if (
        !Number.isInteger(item.maxReservationMinutesPerDay) ||
        item.maxReservationMinutesPerDay <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "maxReservationMinutesPerDay debe ser un entero mayor que 0",
          },
          { status: 400 }
        );
      }
    }

    if (planIds.size > 0) {
      const plans = await prisma.membershipPlan.findMany({
        where: {
          id: {
            in: [...planIds],
          },
          clubId,
        },
        select: {
          id: true,
        },
      });

      if (plans.length !== planIds.size) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Uno o más planes no existen o no pertenecen a este club",
          },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.facilityPlanAccess.deleteMany({
        where: {
          facilityId,
        },
      });

      if (body.planAccesses.length > 0) {
        await tx.facilityPlanAccess.createMany({
          data: body.planAccesses.map(
            (item: {
              membershipPlanId: string;
              maxReservationMinutesPerDay: number;
            }) => ({
              facilityId,
              membershipPlanId: item.membershipPlanId,
              maxReservationMinutesPerDay:
                item.maxReservationMinutesPerDay,
            })
          ),
        });
      }
    });

    const planAccesses = await prisma.facilityPlanAccess.findMany({
      where: {
        facilityId,
      },
      include: {
        membershipPlan: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Accesos de membresías configurados correctamente",
      facilityId,
      planAccesses,
    });
  } catch (error) {
    console.error("Configure facility plan access error:", error);

    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado",
        },
        { status: 401 }
      );
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


export async function GET(
  request: Request,
  context: {
    params: Promise<{
      clubId: string;
      facilityId: string;
    }>;
  }
) {
  try {
    const user = await requireAuth(request);
    const { clubId, facilityId } = await context.params;

    const membership = await prisma.clubMembership.findFirst({
      where: {
        clubId,
        userId: user.id,
        status: "ACTIVE",
      },
    });

    if (!membership && user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "No perteneces a este club",
        },
        { status: 403 }
      );
    }

    const facility = await prisma.facility.findFirst({
      where: {
        id: facilityId,
        clubId,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!facility) {
      return NextResponse.json(
        {
          success: false,
          message: "Instalación no encontrada",
        },
        { status: 404 }
      );
    }

    const planAccesses = await prisma.facilityPlanAccess.findMany({
      where: {
        facilityId,
      },
      include: {
        membershipPlan: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      facility,
      planAccesses,
    });
  } catch (error) {
    console.error("Get facility plan access error:", error);

    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado",
        },
        { status: 401 }
      );
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