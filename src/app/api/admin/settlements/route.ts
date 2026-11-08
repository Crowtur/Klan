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
import { NextResponse } from "next/server";

// Si ya tenías export async function GET aquí, mantenlo arriba.

/** Calcula la liquidación del club y mes solicitados a partir de sus pagos. */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);

    if (user.globalRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "No tienes permisos para generar liquidaciones",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { clubId, year, month } = body;

    if (!clubId || year === undefined || month === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "clubId, year y month son obligatorios",
        },
        { status: 400 }
      );
    }

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

    const club = await prisma.club.findUnique({
      where: {
        id: clubId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!club) {
      return NextResponse.json(
        {
          success: false,
          message: "Club no encontrado",
        },
        { status: 404 }
      );
    }

    const existingSettlement = await prisma.clubSettlement.findUnique({
      where: {
        clubId_year_month: {
          clubId,
          year,
          month,
        },
      },
    });

    if (existingSettlement) {
      return NextResponse.json(
        {
          success: false,
          message: "Ya existe una liquidación para este club y período",
          settlementId: existingSettlement.id,
        },
        { status: 409 }
      );
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const payments = await prisma.payment.findMany({
      where: {
        clubId,
        status: "PAID",
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
      (total: number, payment: { amount: any }) => total + Number(payment.amount),
      0
    );

    const stripeFee = grossAmount * 0.04;
    const transferFee = grossAmount * 0.01;
    const platformFee = grossAmount * 0.05;
    const totalFees = stripeFee + transferFee + platformFee;
    const netAmount = grossAmount - totalFees;

    const settlement = await prisma.clubSettlement.create({
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

    return NextResponse.json(
      {
        success: true,
        message: "Liquidación generada correctamente",
        currency: "USD",
        settlement,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create settlement error:", error);

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