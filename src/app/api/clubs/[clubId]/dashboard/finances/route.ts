/**
 * ==============================================================================
 * PONTIFICIA UNIVERSIDAD CATÓLICA DEL ECUADOR
 * Facultad Internacional de Innovación (PUCE - Icam)
 * ==============================================================================
 * 
 * PROYECTO DE TITULACIÓN - INGENIERÍA INTEGRAL
 * Autor: Diego Alexis Tipán Zambrano
 * Director del Proyecto: PhD. Rafael Melgarejo
 * Promoción: Primera Promoción (Año 2026)
 * 
 * ------------------------------------------------------------------------------
 * DECLARACIÓN SOBRE EL USO DE INTELIGENCIA ARTIFICIAL
 * ------------------------------------------------------------------------------
 * Se declara formalmente el uso de herramientas de Inteligencia Artificial como
 * soporte y asistente técnico para el desarrollo de este proyecto, destacando su
 * aplicación en:
 * 
 * - Generación y optimización de bloques de código repetitivos y extensos.
 * - Desarrollos de endpoints complejos con variabilidad de permisos y roles.
 * - Integración de nuevas funciones y sugerencias de arquitectura de software.
 * - Depuración ágil, corrección de errores y optimización de rendimiento.
 * - Creación, maquetación e integración de diseños UI/UX de formato visual a código.
 * - Automatización de documentación técnica y estructuración de comentarios.
 * 
 * Herramientas de IA utilizadas:
 * - GPT-5.6 Luna
 * - GPT-6 Astra
 * - Gemini 3.6 Flash
 * - Figma AI (Visual Engine / Make Real)
 * 
 * ------------------------------------------------------------------------------
 * DERECHOS DE AUTOR Y PROPIEDAD INTELECTUAL
 * ------------------------------------------------------------------------------
 * Los derechos del presente proyecto corresponden a la Pontificia Universidad
 * Católica del Ecuador junto al autor y al director del proyecto, en estricto
 * cumplimiento del reglamento institucional sobre patentes, tesis y titulación.
 * 
 * ALCANCE: Dichos derechos aplican exclusivamente al código fuente desarrollado
 * en este proyecto, excluyendo la idea de negocio global y futuras versiones 
 * o derivados sustanciales que puedan desarrollarse sobre el sistema.
 * ==============================================================================
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubMembership } from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{
    clubId: string;
  }>;
};

const CLUB_TIME_ZONE = "America/Guayaquil";
const CURRENCY = "usd";

/** Busca el agregado del estado solicitado y devuelve cero si el grupo no existe. */
function getGroupCount(group: {
  _count?: true | { _all?: number };
}): number {
  const count = group._count;

  if (
    count === undefined ||
    count === true ||
    typeof count._all !== "number"
  ) {
    throw new Error(
      "La consulta groupBy no devolvió _count._all"
    );
  }

  return count._all;
}

// Porcentajes del modelo financiero del MVP
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

/** Desglosa las comisiones estimadas que se descuentan del bruto. */
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

  const netAmount = amount.minus(totalFees);

  return {
    stripeFee,
    transferFee,
    platformFee,
    totalFees,
    netAmount,
  };
}

function getMonthStart(
  year: number,
  month: number
): Date {
  return new Date(
    Date.UTC(year, month - 1, 1, 5, 0, 0)
  );
}

/** Determina el año y el mes usados para agrupar movimientos. */
function getLocalYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TIME_ZONE,
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

/** Resume los pagos del club y calcula importes brutos, comisiones y netos por período. */
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Autenticación
    const user = await requireAuth(request);
    const { clubId } = await context.params;

    // 2. Autorización contextual
    const membership = await requireClubMembership(
      user.id,
      clubId
    );

    if (membership.role !== "CLUB_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere el rol CLUB_ADMIN",
        },
        { status: 403 }
      );
    }

    // 3. Validar club
    const club = await prisma.club.findFirst({
      where: {
        id: clubId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!club) {
      return NextResponse.json(
        {
          success: false,
          message: "Club no encontrado o inactivo",
        },
        { status: 404 }
      );
    }

    // 4. Período seleccionado
    const now = new Date();
    const currentMonth = getLocalYearMonth(now);

    const { searchParams } = new URL(request.url);

    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const year =
      yearParam === null
        ? currentMonth.year
        : Number(yearParam);

    const month =
      monthParam === null
        ? currentMonth.month
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

    const periodStart = getMonthStart(year, month);
    const periodEnd = getMonthStart(year, month + 1);

    const historyStart = getMonthStart(
      year,
      month - 11
    );

    // 5. Consultas
    const [
      paymentsByStatus,
      paidPayments,
      historicalPayments,
      plans,
      settlements,
    ] = await prisma.$transaction([
      // Estados de pagos creados en el período
      prisma.payment.groupBy({
        by: ["status"],
        where: {
          clubId,
          currency: CURRENCY,
          createdAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
        orderBy: {
          status: "asc",
        },
        _count: {
          _all: true,
        },
      }),

      // Pagos confirmados en el período
      prisma.payment.findMany({
        where: {
          clubId,
          currency: CURRENCY,
          status: "PAID",
          paidAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          subscription: {
            select: {
              planId: true,
            },
          },
        },
      }),

      // Historial de pagos confirmados
      prisma.payment.findMany({
        where: {
          clubId,
          currency: CURRENCY,
          status: "PAID",
          paidAt: {
            gte: historyStart,
            lt: periodEnd,
          },
        },
        select: {
          id: true,
          amount: true,
          paidAt: true,
        },
      }),

      prisma.membershipPlan.findMany({
        where: { clubId },
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
      }),

      // Liquidaciones registradas para el mes
      prisma.clubSettlement.findMany({
        where: {
          clubId,
          year,
          month,
        },
        select: {
          id: true,
          grossAmount: true,
          stripeFee: true,
          transferFee: true,
          platformFee: true,
          totalFees: true,
          netAmount: true,
          status: true,
          paidAt: true,
          paymentReference: true,
        },
      }),
    ]);

    // 6. Resumen de pagos
    const paymentStatusCounts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      PAID: 0,
      FAILED: 0,
      CANCELLED: 0,
      REFUNDED: 0,
    };

    for (const group of paymentsByStatus) {
      paymentStatusCounts[group.status] =
        getGroupCount(group);
    }

    // 7. Cálculos financieros del período
    // Se calcula por pago para mantener el redondeo
    // individual de cada comisión.
    let grossRevenue = ZERO;
    let stripeFees = ZERO;
    let transferFees = ZERO;
    let platformFees = ZERO;
    let totalFees = ZERO;
    let netRevenue = ZERO;

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

      netRevenue = netRevenue.plus(
        fees.netAmount
      );
    }

    // 8. Ingresos por plan
    const revenueByPlan = plans.map((plan) => {
      const matchingPayments = paidPayments.filter(
        (payment) =>
          payment.subscription.planId === plan.id
      );

      const planGross = sumMoney(
        matchingPayments.map(
          (payment) => payment.amount
        )
      );

      const planFees = matchingPayments.map(
        (payment) =>
          calculateFees(payment.amount)
      );

      const planPlatformFees = sumMoney(
        planFees.map((fees) => fees.platformFee)
      );

      const planNet = sumMoney(
        planFees.map((fees) => fees.netAmount)
      );

      return {
        planId: plan.id,
        planName: plan.name,
        planType: plan.type,
        isActive: plan.isActive,
        paidPayments: matchingPayments.length,
        grossRevenue: money(planGross),
        platformFees: money(planPlatformFees),
        netRevenue: money(planNet),
      };
    });

    // 9. Evolución mensual de ingresos
    const monthlyRevenue = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(
        Date.UTC(year, month - 1 - i, 1)
      );

      const itemYear = date.getUTCFullYear();
      const itemMonth = date.getUTCMonth() + 1;

      const monthPayments = historicalPayments.filter(
        (payment) => {
          if (!payment.paidAt) return false;

          const local = getLocalYearMonth(
            payment.paidAt
          );

          return (
            local.year === itemYear &&
            local.month === itemMonth
          );
        }
      );

      const monthGross = sumMoney(
        monthPayments.map(
          (payment) => payment.amount
        )
      );

      const monthFees = monthPayments.map(
        (payment) =>
          calculateFees(payment.amount)
      );

      const monthPlatformFees = sumMoney(
        monthFees.map(
          (fees) => fees.platformFee
        )
      );

      const monthNet = sumMoney(
        monthFees.map(
          (fees) => fees.netAmount
        )
      );

      monthlyRevenue.push({
        year: itemYear,
        month: itemMonth,
        label:
          `${itemYear}-${String(itemMonth).padStart(2, "0")}`,
        paidPayments: monthPayments.length,
        grossRevenue: money(monthGross),
        platformFees: money(monthPlatformFees),
        netRevenue: money(monthNet),
      });
    }

    // 10. Liquidaciones registradas
    const settlementRecords = settlements.map(
      (settlement) => ({
        id: settlement.id,
        status: settlement.status,
        grossAmount: money(settlement.grossAmount),
        stripeFee: money(settlement.stripeFee),
        transferFee: money(settlement.transferFee),
        platformFee: money(settlement.platformFee),
        totalFees: money(settlement.totalFees),
        netAmount: money(settlement.netAmount),
        paidAt: settlement.paidAt,
        paymentReference: settlement.paymentReference,
      })
    );

    // 11. Respuesta
    return NextResponse.json({
      success: true,

      club,

      period: {
        year,
        month,
        timeZone: CLUB_TIME_ZONE,
        startAt: periodStart.toISOString(),
        endAtExclusive: periodEnd.toISOString(),
      },

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

        fees: {
          stripe: money(stripeFees),
          transfer: money(transferFees),
          platform: money(platformFees),
          total: money(totalFees),
        },

        estimatedClubNet: money(netRevenue),
      },

      paymentStatuses: {
        basis: "createdAt",
        counts: paymentStatusCounts,
      },

      revenueByPlan,
      monthlyRevenue,

      settlements: settlementRecords,
    });
  } catch (error) {
    console.error(
      "Club dashboard finances error:",
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