import {paymentCsv} from "@/lib/clubs/payment-csv";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
import { PaymentStatus, Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    // 1. Obtener el usuario autenticado.
    const user = await requireAuth(request);

    // 2. Leer los parámetros.
    const { searchParams } = new URL(request.url);

    const pageParam = searchParams.get("page") ?? "1";
    const limitParam = searchParams.get("limit") ?? "10";
    const statusParam = searchParams.get("status");

    // 3. Validar la paginación.
    const validPositiveInteger = (value: string) =>
      /^[1-9]\d*$/.test(value) &&
      Number.isSafeInteger(Number(value));

    if (
      !validPositiveInteger(pageParam) ||
      !validPositiveInteger(limitParam)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Los parámetros page y limit deben ser enteros positivos",
        },
        { status: 400 }
      );
    }

    const page = Number(pageParam);
    const limit = Number(limitParam);

    if (
      limit > 50 ||
      (page - 1) * limit > 100000
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Los parámetros de paginación exceden los límites permitidos",
        },
        { status: 400 }
      );
    }

    // 4. Validar el filtro opcional por estado.
    if (
      statusParam !== null &&
      !Object.values(PaymentStatus).includes(
        statusParam as PaymentStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Estado de pago no válido",
        },
        { status: 400 }
      );
    }

    // 5. Filtrar siempre por el usuario autenticado.
    const year=searchParams.get("year");
    if(year && !/^\d{4}$/.test(year))return NextResponse.json({success:false},{status:400});
    const where: Prisma.PaymentWhereInput = {
      userId: user.id,
      ...(year && {createdAt:{gte:new Date(Date.UTC(+year,0)),lt:new Date(Date.UTC(+year+1,0))}}),
      ...(searchParams.get("clubId") ? { clubId: searchParams.get("clubId")! } : {}),
      ...(statusParam !== null && {
        status: statusParam as PaymentStatus,
      }),
    };

    // 6. Consultar los pagos y su cantidad total.
    if(new URL(request.url).searchParams.get("format")==="csv") return paymentCsv(where);
    const [payments, total, paid, lastPaid, pendingByClub] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          paidAt: true,
          createdAt: true,
          updatedAt: true,

          club: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
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
                  durationValue: true,
                  durationUnit: true,
                },
              },
            },
          },
        },
      }),

      prisma.payment.count({ where }),
      prisma.payment.aggregate({where:{userId:user.id,status:"PAID",paidAt:{gte:new Date(Date.UTC(Number(year||new Date().getUTCFullYear()),0)),lt:new Date(Date.UTC(Number(year||new Date().getUTCFullYear())+1,0))}},_sum:{amount:true},_count:true}),
      prisma.payment.findFirst({where:{userId:user.id,status:"PAID"},orderBy:{paidAt:"desc"},select:{id:true,amount:true,paidAt:true,club:{select:{name:true}}}}),
      prisma.paymentObligation.groupBy({by:["clubId"],orderBy:{clubId:"asc"},where:{userId:user.id,status:"OPEN",...(where.clubId && {clubId:String(where.clubId)})},_sum:{amount:true}}),
    ]);

    // 7. Devolver el historial paginado.
    return NextResponse.json({
      success: true,
      payments,summary:{paid,lastPaid,pendingByClub},
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get my payments error:", error);

    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado",
        },
        { status: 401 }
      );
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
