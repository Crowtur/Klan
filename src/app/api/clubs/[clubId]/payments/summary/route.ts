import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";

export async function GET(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const user = await requireAuth(request);

    const { clubId } = await context.params;

    await requireClubAdmin(user.id, clubId);

    const { searchParams } = new URL(request.url);

    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    if (!yearParam || !monthParam) {
      return NextResponse.json(
        {
          success: false,
          message: "Los parámetros year y month son obligatorios",
        },
        { status: 400 }
      );
    }

    const year = Number(yearParam);
    const month = Number(monthParam);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Year o month no tienen un formato válido",
        },
        { status: 400 }
      );
    }

    const startDate = new Date(year, month - 1, 1);

    const endDate = new Date(year, month, 1);

    const payments = await prisma.payment.findMany({
      where: {
        clubId,
        status: PaymentStatus.PAID,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        amount: true,
      },
    });

    const grossAmount = payments.reduce(
      (total, payment) => total + Number(payment.amount),
      0
    );

    const stripeFee = grossAmount * 0.04;

    const transferFee = grossAmount * 0.01;

    const platformFee = grossAmount * 0.05;

    const totalFees = stripeFee + transferFee + platformFee;

    const netAmount = grossAmount - totalFees;

    return NextResponse.json({
      success: true,
      clubId,
      year,
      month, 
      currency: "USD",
      summary: {
        grossAmount: Number(grossAmount.toFixed(2)),
        stripeFee: Number(stripeFee.toFixed(2)),
        transferFee: Number(transferFee.toFixed(2)),
        platformFee: Number(platformFee.toFixed(2)),
        totalFees: Number(totalFees.toFixed(2)),
        netAmount: Number(netAmount.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Get club payment summary error:", error);

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
            message: "No tienes permisos para ver el resumen financiero de este club",
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