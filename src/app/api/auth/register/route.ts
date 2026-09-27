import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { firstName, lastName, email, password } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Todos los campos son obligatorios",
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "El correo electrónico ya está registrado",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Usuario registrado correctamente",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          globalRole: user.globalRole,
          status: user.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}