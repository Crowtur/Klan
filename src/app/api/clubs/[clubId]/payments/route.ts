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

    const status = searchParams.get("status");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

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

    const payments = await prisma.payment.findMany({
      where,
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
      payments,
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