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
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubMembership } from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{
    clubId: string;
    facilityId: string;
    reservationId: string;
  }>;
};

/** Busca una reserva dentro del club y la instalación y comprueba su visibilidad. */
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Autenticar usuario
    const user = await requireAuth(request);

    const { clubId, facilityId, reservationId } =
      await context.params;

    // 2. Validar membresía activa en el club
    const membership = await requireClubMembership(
      user.id,
      clubId
    );

    // 3. Comprobar que la instalación pertenece al club
    const facility = await prisma.facility.findFirst({
      where: {
        id: facilityId,
        clubId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!facility) {
      return NextResponse.json(
        {
          success: false,
          message: "Reserva no encontrada",
        },
        { status: 404 }
      );
    }

    // 4. Buscar reserva dentro de la instalación
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        facilityId,
        ...(membership.role !== "CLUB_ADMIN"
          ? { clubMembershipId: membership.id }
          : {}),
      },
      select: {
        id: true,
        facilityId: true,
        clubMembershipId: true,
        startAt: true,
        endAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        {
          success: false,
          message: "Reserva no encontrada",
        },
        { status: 404 }
      );
    }

    // 5. Respuesta
    return NextResponse.json({
      success: true,
      facility,
      reservation,
    });
  } catch (error) {
    console.error("Get reservation error:", error);

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
            message:
              "No tienes permisos para consultar reservas de este club",
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



/** Comprueba el derecho a cancelar antes de cambiar el estado de la reserva. */
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Autenticar usuario
    const user = await requireAuth(request);

    const { clubId, facilityId, reservationId } =
      await context.params;

    // 2. Verificar membresía activa en el club
    const membership = await requireClubMembership(
      user.id,
      clubId
    );

    // 3. Verificar que la instalación pertenece al club
    const facility = await prisma.facility.findFirst({
      where: {
        id: facilityId,
        clubId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!facility) {
      return NextResponse.json(
        {
          success: false,
          message: "Reserva no encontrada",
        },
        { status: 404 }
      );
    }

    // 4. Buscar la reserva aplicando los permisos
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        facilityId,
        ...(membership.role !== "CLUB_ADMIN"
          ? { clubMembershipId: membership.id }
          : {}),
      },
      select: {
        id: true,
        facilityId: true,
        clubMembershipId: true,
        startAt: true,
        endAt: true,
        status: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        {
          success: false,
          message: "Reserva no encontrada",
        },
        { status: 404 }
      );
    }

    // 5. Evitar cancelaciones repetidas
    if (reservation.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          message: "Esta reserva ya está cancelada",
        },
        { status: 409 }
      );
    }

    // 6. No cancelar reservas que ya comenzaron
    const now = new Date();

    if (reservation.startAt <= now) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No puedes cancelar una reserva que ya comenzó",
        },
        { status: 409 }
      );
    }

    // 7. Actualización condicional y atómica
    const result = await prisma.$transaction(async tx=>{const result=await tx.reservation.updateMany({
      where: {
        id: reservationId,
        facilityId,
        status: "CONFIRMED",
        startAt: {
          gt: new Date(),
        },
        ...(membership.role !== "CLUB_ADMIN"
          ? { clubMembershipId: membership.id }
          : {}),
      },
      data: {
        status: "CANCELLED",cancelledAt:new Date(),cancelledById:user.id,
      },
    });

    if(result.count){
      const owner=await tx.clubMembership.findUniqueOrThrow({where:{id:reservation.clubMembershipId},select:{userId:true}});
      await tx.notification.create({data:{recipientId:owner.userId,clubId,type:"RESERVATION_CANCELLED",eventKey:"cancel:"+reservationId,entityType:"reservation",entityId:reservationId,title:"Reserva cancelada",targetPath:"/app?view=club&club="+clubId}});
    }
    return result;});
    // Si otra solicitud canceló la reserva primero,
    // la actualización no afectará ninguna fila.
    if (result.count === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La reserva ya fue cancelada o no puede cancelarse",
        },
        { status: 409 }
      );
    }

    // 8. Recuperar la reserva actualizada
    const cancelledReservation =
      await prisma.reservation.findUnique({
        where: {
          id: reservationId,
        },
        select: {
          id: true,
          facilityId: true,
          clubMembershipId: true,
          startAt: true,
          endAt: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      success: true,
      message: "Reserva cancelada correctamente",
      reservation: cancelledReservation,
    });
  } catch (error) {
    console.error("Cancel reservation error:", error);

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
            message:
              "No tienes permisos para cancelar reservas de este club",
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
