import {activeMember} from "@/lib/clubs/active";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

// GET: Obtener todos los clubes a los que pertenece el usuario autenticado
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const memberships = await prisma.clubMembership.findMany({
      where: {
        userId: user.id, ...activeMember(),
        club: {
          status: "ACTIVE",
        },
      },
      include: {
        club: {include:{_count:{select:{memberships:{where:activeMember()}}}}},
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    const clubs = memberships.map((membership) => ({
      id: membership.club.id,
      name: membership.club.name,
      slug: membership.club.slug,
      description: membership.club.description,
      logoUrl: membership.club.logoUrl, coverUrl: membership.club.coverUrl, address: membership.club.address,
      status: membership.club.status,
      memberCount: membership.club._count.memberships,
      role: membership.role,
      membershipStatus: membership.status,
      joinedAt: membership.joinedAt,
    }));

    return NextResponse.json({
      success: true,
      clubs,
    });
  } catch (error) {
    console.error("Get clubs error:", error);

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

// POST: Crear un nuevo club y asignar al creador como CLUB_ADMIN
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);

    const body = await request.json();

    const { name, slug, description } = body;

    if (typeof name !== "string" || !name.trim() || name.trim().length > 50 || typeof slug !== "string" || slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || (description != null && (typeof description !== "string" || description.length > 200))) {
      return NextResponse.json(
        {
          success: false,
          message: "El nombre y el slug son obligatorios",
        },
        { status: 400 }
      );
    }

    const {address,googleMapsUrl}=body;
    if((address!=null && (typeof address!=="string"||address.length>2048))||(googleMapsUrl!=null && (typeof googleMapsUrl!=="string"||googleMapsUrl.length>2048||!/^https:\/\//i.test(googleMapsUrl))))return NextResponse.json({error:"Dirección inválida"},{status:400});
    const existingClub = await prisma.club.findUnique({
      where: {
        slug,
      },
    });

    if (existingClub) {
      return NextResponse.json(
        {
          success: false,
          message: "El slug del club ya está registrado",
        },
        { status: 409 }
      );
    }

    const club = await prisma.club.create({
      data: {
        name: name.trim(),address,googleMapsUrl,
        slug,
        description,
        memberships: {
          create: {
            userId: user.id,
            role: "CLUB_ADMIN",events:{create:{eventKey:crypto.randomUUID(),type:"JOINED",newRole:"CLUB_ADMIN",newStatus:"ACTIVE",actorId:user.id}},
          },
        },
      },
      include: {
        memberships: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Club creado correctamente",
        club,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create club error:", error);

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