import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "CRON_SECRET no está configurado",
        },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado",
        },
        { status: 401 }
      );
    }

    const now = new Date();

    // Procesar el mes anterior
    const year =
      now.getUTCMonth() === 0
        ? now.getUTCFullYear() - 1
        : now.getUTCFullYear();

    const month =
      now.getUTCMonth() === 0
        ? 12
        : now.getUTCMonth();

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const payments = await prisma.payment.findMany({
      where: {
        status: "PAID",
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        clubId: true,
        amount: true,
      },
    });

    const paymentsByClub = new Map<
      string,
      { grossAmount: number }
    >();

    for (const payment of payments) {
      const current = paymentsByClub.get(payment.clubId);

      if (current) {
        current.grossAmount += Number(payment.amount);
      } else {
        paymentsByClub.set(payment.clubId, {
          grossAmount: Number(payment.amount),
        });
      }
    }

    const createdSettlements = [];
    const skippedSettlements = [];

    for (const [clubId, data] of paymentsByClub) {
      const existingSettlement =
        await prisma.clubSettlement.findUnique({
          where: {
            clubId_year_month: {
              clubId,
              year,
              month,
            },
          },
        });

      if (existingSettlement) {
        skippedSettlements.push(existingSettlement.id);
        continue;
      }

      const grossAmount = data.grossAmount;

      const stripeFee = grossAmount * 0.04;
      const transferFee = grossAmount * 0.01;
      const platformFee = grossAmount * 0.05;
      const totalFees =
        stripeFee + transferFee + platformFee;

      const netAmount = grossAmount - totalFees;

      const settlement =
        await prisma.clubSettlement.create({
          data: {
            clubId,
            year,
            month,
            grossAmount: grossAmount.toFixed(2),
            stripeFee: stripeFee.toFixed(2),
            transferFee: transferFee.toFixed(2),
            platformFee: platformFee.toFixed(2),
            totalFees: totalFees.toFixed(2),
            netAmount: netAmount.toFixed(2),
            status: "PENDING",
          },
        });

      createdSettlements.push(settlement);
    }

    return NextResponse.json({
      success: true,
      currency: "USD",
      period: {
        year,
        month,
      },
      processedPayments: payments.length,
      created: createdSettlements.length,
      skipped: skippedSettlements.length,
      settlements: createdSettlements,
    });
  } catch (error) {
    console.error("Cron settlements error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}