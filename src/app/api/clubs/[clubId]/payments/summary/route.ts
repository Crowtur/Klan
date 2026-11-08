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
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";

/** Agrega los cobros del club para el resumen financiero del período. */
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