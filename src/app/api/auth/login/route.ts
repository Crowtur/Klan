import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createAuthToken } from "@/lib/auth/jwt";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "El correo y la contraseña son obligatorios",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Credenciales inválidas",
        },
        { status: 401 }
      );
    }

    const passwordValid = await verifyPassword(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Credenciales inválidas",
        },
        { status: 401 }
      );
    }

    const token = createAuthToken({
      userId: user.id,
      email: user.email,
      globalRole: user.globalRole,
    });

    const response = NextResponse.json({
      success: true,
      message: "Inicio de sesión correcto",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        globalRole: user.globalRole,
        status: user.status,
      },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}