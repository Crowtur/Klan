import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");

    if (!cookieHeader) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado",
        },
        { status: 401 }
      );
    }

    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((cookie) => {
        const [key, ...value] = cookie.split("=");
        return [key, value.join("=")];
      })
    );

    const token = cookies.auth_token;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado",
        },
        { status: 401 }
      );
    }

    const payload = verifyAuthToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Usuario no encontrado",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        globalRole: user.globalRole,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Session error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Sesión inválida o expirada",
      },
      { status: 401 }
    );
  }
}