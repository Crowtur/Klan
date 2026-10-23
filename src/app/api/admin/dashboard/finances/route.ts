
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";

const TIME_ZONE = "America/Guayaquil";
const CURRENCY = "usd";

const STRIPE_RATE = new Prisma.Decimal("0.04");
const TRANSFER_RATE = new Prisma.Decimal("0.01");
const PLATFORM_RATE = new Prisma.Decimal("0.05");

const ZERO = new Prisma.Decimal(0);

type Money = Prisma.Decimal;

function money(value: Money): string {
  return value.toFixed(2);
}

function roundMoney(value: Money): Money {
  return new Prisma.Decimal(value.toFixed(2));
}

function sumMoney(values: Money[]): Money {
  return values.reduce(
    (total, value) => total.plus(value),
    ZERO
  );
}

function calculateFees(amount: Money) {
  const stripeFee = roundMoney(
    amount.mul(STRIPE_RATE)
  );

  const transferFee = roundMoney(
    amount.mul(TRANSFER_RATE)
  );

  const platformFee = roundMoney(
    amount.mul(PLATFORM_RATE)
  );

  const totalFees = stripeFee
    .plus(transferFee)
    .plus(platformFee);

  return {
    stripeFee,
    transferFee,
    platformFee,
    totalFees,
    netAmount: amount.minus(totalFees),
  };
}

function monthStart(year: number, month: number) {
  return new Date(
    Date.UTC(year, month - 1, 1, 5, 0, 0)
  );
}

function getLocalYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
  };
}

function monthLabel(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  try {
    // 1. Autenticación
    const user = await requireAuth(request);

    // 2. Autorización global
    if (user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Acceso exclusivo para SUPER_ADMIN",
        },
        { status: 403 }
      );
    }

    // 3. Parámetros del período
    const now = new Date();
    const current = getLocalYearMonth(now);

    const { searchParams } = new URL(request.url);

    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const year =
      yearParam === null
        ? current.year
        : Number(yearParam);

    const month =
      monthParam === null
        ? current.month
        : Number(monthParam);

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Parámetros year o month inválidos",
        },
        { status: 400 }
      );
    }

    const periodStart = monthStart(year, month);
    const periodEnd = monthStart(year, month + 1);
    const historyStart = monthStart(year, month - 11);

    // 4. Consultas globales
    const [
      paidPayments,
      historicalPayments,
      clubs,
      settlements,
    ] = await prisma.$transaction([
      // Pagos confirmados en el período
      prisma.payment.findMany({
        where: {
          status: "PAID",
          currency: CURRENCY,
          paidAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
        select: {
          id: true,
          clubId: true,
          amount: true,
          paidAt: true,
        },
      }),

      // Pagos confirmados en los últimos 12 meses
      prisma.payment.findMany({
        where: {
          status: "PAID",
          currency: CURRENCY,
          paidAt: {
            gte: historyStart,
            lt: periodEnd,
          },
        },
        select: {
          id: true,
          clubId: true,
          amount: true,
          paidAt: true,
        },
      }),

      // Todos los clubes
      prisma.club.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
        orderBy: {
          name: "asc",
        },
      }),

      // Liquidaciones del período seleccionado
      prisma.clubSettlement.findMany({
        where: {
          year,
          month,
        },
        select: {
          id: true,
          clubId: true,
          grossAmount: true,
          stripeFee: true,
          transferFee: true,
          platformFee: true,
          totalFees: true,
          netAmount: true,
          status: true,
          paidAt: true,
          paymentReference: true,
          club: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    // 5. Totales financieros estimados
    let grossRevenue = ZERO;
    let stripeFees = ZERO;
    let transferFees = ZERO;
    let platformFees = ZERO;
    let totalFees = ZERO;
    let estimatedClubNet = ZERO;

    for (const payment of paidPayments) {
      const fees = calculateFees(payment.amount);

      grossRevenue = grossRevenue.plus(
        payment.amount
      );

      stripeFees = stripeFees.plus(
        fees.stripeFee
      );

      transferFees = transferFees.plus(
        fees.transferFee
      );

      platformFees = platformFees.plus(
        fees.platformFee
      );

      totalFees = totalFees.plus(
        fees.totalFees
      );

      estimatedClubNet = estimatedClubNet.plus(
        fees.netAmount
      );
    }

    // 6. Estadísticas por club
    const financesByClub = clubs.map((club) => {
      const clubPayments = paidPayments.filter(
        (payment) => payment.clubId === club.id
      );

      const clubGross = sumMoney(
        clubPayments.map(
          (payment) => payment.amount
        )
      );

      const clubFeeResults = clubPayments.map(
        (payment) => calculateFees(payment.amount)
      );

      const clubPlatformFees = sumMoney(
        clubFeeResults.map(
          (fees) => fees.platformFee
        )
      );

      const clubTotalFees = sumMoney(
        clubFeeResults.map(
          (fees) => fees.totalFees
        )
      );

      const clubNet = sumMoney(
        clubFeeResults.map(
          (fees) => fees.netAmount
        )
      );

      return {
        clubId: club.id,
        clubName: club.name,
        clubSlug: club.slug,
        clubStatus: club.status,
        paidPayments: clubPayments.length,
        grossRevenue: money(clubGross),
        platformFees: money(clubPlatformFees),
        totalFees: money(clubTotalFees),
        estimatedClubNet: money(clubNet),
      };
    }).sort(
      (a, b) =>
        Number(b.grossRevenue) -
        Number(a.grossRevenue)
    );

    // 7. Evolución mensual de ingresos
    const monthlyRevenue = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(
        Date.UTC(year, month - 1 - i, 1)
      );

      const itemYear = date.getUTCFullYear();
      const itemMonth = date.getUTCMonth() + 1;

      const matchingPayments =
        historicalPayments.filter((payment) => {
          if (!payment.paidAt) return false;

          const local = getLocalYearMonth(
            payment.paidAt
          );

          return (
            local.year === itemYear &&
            local.month === itemMonth
          );
        });

      const monthGross = sumMoney(
        matchingPayments.map(
          (payment) => payment.amount
        )
      );

      const feeResults = matchingPayments.map(
        (payment) =>
          calculateFees(payment.amount)
      );

      const monthPlatformFees = sumMoney(
        feeResults.map(
          (fees) => fees.platformFee
        )
      );

      const monthTotalFees = sumMoney(
        feeResults.map(
          (fees) => fees.totalFees
        )
      );

      const monthNet = sumMoney(
        feeResults.map(
          (fees) => fees.netAmount
        )
      );

      monthlyRevenue.push({
        year: itemYear,
        month: itemMonth,
        label: monthLabel(itemYear, itemMonth),
        paidPayments: matchingPayments.length,
        grossRevenue: money(monthGross),
        platformFees: money(monthPlatformFees),
        totalFees: money(monthTotalFees),
        estimatedClubNet: money(monthNet),
      });
    }

    // 8. Liquidaciones registradas
    const settlementStatusCounts = {
      PENDING: 0,
      PROCESSING: 0,
      PAID: 0,
      CANCELLED: 0,
    };

    for (const settlement of settlements) {
      settlementStatusCounts[settlement.status]++;
    }

    const recordedSettlementGross = sumMoney(
      settlements.map(
        (settlement) => settlement.grossAmount
      )
    );

    const recordedSettlementNet = sumMoney(
      settlements.map(
        (settlement) => settlement.netAmount
      )
    );

    const recordedPlatformFees = sumMoney(
      settlements.map(
        (settlement) => settlement.platformFee
      )
    );

    const paidSettlements = settlements.filter(
      (settlement) => settlement.status === "PAID"
    );

    const transferredNet = sumMoney(
      paidSettlements.map(
        (settlement) => settlement.netAmount
      )
    );

    const pendingTransferNet = sumMoney(
      settlements
        .filter(
          (settlement) =>
            settlement.status === "PENDING" ||
            settlement.status === "PROCESSING"
        )
        .map(
          (settlement) => settlement.netAmount
        )
    );

    // 9. Detalle de liquidaciones
    const settlementRecords = settlements.map(
      (settlement) => ({
        id: settlement.id,
        clubId: settlement.clubId,
        clubName: settlement.club.name,
        status: settlement.status,
        grossAmount: money(settlement.grossAmount),
        stripeFee: money(settlement.stripeFee),
        transferFee: money(settlement.transferFee),
        platformFee: money(settlement.platformFee),
        totalFees: money(settlement.totalFees),
        netAmount: money(settlement.netAmount),
        paidAt: settlement.paidAt,
        paymentReference:
          settlement.paymentReference,
      })
    );

    // 10. Respuesta
    return NextResponse.json({
      success: true,

      period: {
        year,
        month,
        timeZone: TIME_ZONE,
        startAt: periodStart.toISOString(),
        endAtExclusive: periodEnd.toISOString(),
      },

      generatedAt: now.toISOString(),
      currency: "USD",

      feeModel: {
        stripeRate: "0.04",
        transferRate: "0.01",
        platformRate: "0.05",
        totalRate: "0.10",
        estimated: true,
      },

      summary: {
        paidPayments: paidPayments.length,
        grossRevenue: money(grossRevenue),

        estimatedFees: {
          stripe: money(stripeFees),
          transfer: money(transferFees),
          platform: money(platformFees),
          total: money(totalFees),
        },

        estimatedClubNet: money(estimatedClubNet),
      },

      financesByClub,
      monthlyRevenue,

      settlements: {
        total: settlements.length,
        byStatus: settlementStatusCounts,

        recordedGross: money(
          recordedSettlementGross
        ),

        recordedPlatformFees: money(
          recordedPlatformFees
        ),

        recordedNet: money(
          recordedSettlementNet
        ),

        transferredNet: money(
          transferredNet
        ),

        pendingTransferNet: money(
          pendingTransferNet
        ),

        records: settlementRecords,
      },

      reconciliation: {
        estimatedGross: money(grossRevenue),
        recordedSettlementGross: money(
          recordedSettlementGross
        ),
        grossDifference: money(
          grossRevenue.minus(
            recordedSettlementGross
          )
        ),

        estimatedPlatformFees: money(
          platformFees
        ),
        recordedPlatformFees: money(
          recordedPlatformFees
        ),
        platformFeeDifference: money(
          platformFees.minus(
            recordedPlatformFees
          )
        ),
      },
    });
  } catch (error) {
    console.error(
      "SuperAdmin dashboard finances error:",
      error
    );

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
            message: "Acceso denegado",
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
