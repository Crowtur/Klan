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

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/** Agrupa pagos completados por club y genera las liquidaciones pendientes del período. */
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