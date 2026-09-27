import { requireAuth } from "@/lib/auth/auth";
import { requireSuperAdmin } from "@/lib/auth/authorization";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    await requireSuperAdmin(user.id);

    return NextResponse.json({
      success: true,
      message: "Acceso autorizado como SUPER_ADMIN",
    });
  } catch (error) {
    console.error("Admin test error:", error);

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
            message: "No tienes permisos de SUPER_ADMIN",
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