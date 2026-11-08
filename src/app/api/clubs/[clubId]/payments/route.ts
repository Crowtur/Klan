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

import {paymentCsv} from "@/lib/clubs/payment-csv";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";

/** Consulta o exporta los pagos del club con los filtros administrativos recibidos. */
export async function GET(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
) {
  try {
    const user = await requireAuth(request);

    const { clubId } = await context.params;

    await requireClubAdmin(user.id, clubId);

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if((status&&!Object.values(PaymentStatus).includes(status as PaymentStatus))||(year&&!/^\d{4}$/.test(year))||(month&&(!year||!/^([1-9]|1[0-2])$/.test(month))))return NextResponse.json({error:"Filtros inválidos"},{status:400});
    // Lógica para acotar el rango exacto de fechas (gte: inicio del período, lt: inicio del siguiente período)
    let createdAtFilter: { gte?: Date; lt?: Date } | undefined = undefined;

    if (year) {
      const y = parseInt(year, 10);
      if (month) {
        const m = parseInt(month, 10);
        createdAtFilter = {
          gte: new Date(Date.UTC(y, m - 1, 1)),
          lt: new Date(Date.UTC(y, m, 1)),
        };
      } else {
        createdAtFilter = {
          gte: new Date(Date.UTC(y, 0, 1)),
          lt: new Date(Date.UTC(y + 1, 0, 1)),
        };
      }
    }

    const where = {
      clubId,
      ...(status ? { status: status as PaymentStatus } : {}),
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };

    if(new URL(request.url).searchParams.get("format")==="csv") return paymentCsv(where);
    const page=Number(searchParams.get("page")??1),limit=Number(searchParams.get("limit")??50);
    if(!Number.isSafeInteger(page)||page<1||page>10000||!Number.isSafeInteger(limit)||limit<1||limit>100)return NextResponse.json({success:false},{status:400});
    const total=await prisma.payment.count({where});
    const payments = await prisma.payment.findMany({
      where,skip:(page-1)*limit,take:limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        subscription: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            expiresAt: true,
            plan: {
              select: {
                id: true,
                name: true,
                type: true,
                price: true,
                durationValue: true,
                durationUnit: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      currency: "USD",
      filters: {
        status: status || null,
        year: year || null,
        month: month || null,
      },
      payments,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)},
    });
  } catch (error) {
    console.error("Get club payments error:", error);

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
            message: "No tienes permisos para ver los pagos de este club",
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