import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ settlementId: string }> }
) {
  try {
    const user = await requireAuth(request);

    if (user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "No tienes permisos para consultar las liquidaciones",
        },
        { status: 403 }
      );
    }

    const { settlementId } = await context.params;

    const settlement = await prisma.clubSettlement.findUnique({
      where: {
        id: settlementId,
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!settlement) {
      return NextResponse.json(
        {
          success: false,
          message: "Liquidación no encontrada",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      currency: "USD",
      settlement,
    });
  } catch (error) {
    console.error("Get settlement detail error:", error);

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ settlementId: string }> }
) {
  try {
    const user = await requireAuth(request);

    if (user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "No tienes permisos para actualizar las liquidaciones",
        },
        { status: 403 }
      );
    }

    const { settlementId } = await context.params;

    const body = await request.json();

    const { status, paymentReference, notes } = body;

    const validStatuses = ["PENDING", "PROCESSING", "PAID"];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Estado de liquidación inválido",
        },
        { status: 400 }
      );
    }

    const settlement = await prisma.clubSettlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement) {
      return NextResponse.json(
        {
          success: false,
          message: "Liquidación no encontrada",
        },
        { status: 404 }
      );
    }

    const currentStatus = settlement.status;

    const validTransition =
      (currentStatus === "PENDING" && status === "PROCESSING") ||
      (currentStatus === "PROCESSING" && status === "PAID");

    if (!validTransition) {
      return NextResponse.json(
        {
          success: false,
          message: `No se puede cambiar el estado de ${currentStatus} a ${status}`,
        },
        { status: 400 }
      );
    }

    if (status === "PAID" && !paymentReference) {
      return NextResponse.json(
        {
          success: false,
          message: "La referencia de pago es obligatoria al marcar una liquidación como PAID",
        },
        { status: 400 }
      );
    }

    const updatedSettlement = await prisma.$transaction(async tx=>{const updated=await tx.clubSettlement.update({
      where: { id: settlementId },
      data: {
        status,
        ...(status === "PAID"
          ? {
              paidAt: new Date(),
              paymentReference,
              notes: notes ?? null,
            }
          : {
              notes: notes ?? settlement.notes,
            }),
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const admins=await tx.clubMembership.findMany({where:{clubId:updated.clubId,role:"CLUB_ADMIN",status:"ACTIVE"},select:{userId:true}});
    await tx.notification.createMany({data:admins.map(m=>({recipientId:m.userId,clubId:updated.clubId,type:"SETTLEMENT_UPDATED",eventKey:"settlement:"+settlementId+":"+status,entityType:"settlement",entityId:settlementId,title:"Liquidación actualizada",targetPath:"/app?view=club&club="+updated.clubId})),skipDuplicates:true});
    return updated;});
    return NextResponse.json({
      success: true,
      currency: "USD",
      settlement: updatedSettlement,
    });
  } catch (error) {
    console.error("Update settlement error:", error);

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