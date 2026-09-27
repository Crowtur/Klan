import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const users = await prisma.user.findMany();

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Database error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error connecting to database",
      },
      { status: 500 }
    );
  }
}