import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth/jwt";

export async function getCurrentUser(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((cookie) => {
      const [key, ...value] = cookie.split("=");
      return [key, value.join("=")];
    })
  );

  const token = cookies.auth_token;

  return userFromToken(token);
}

export async function userFromToken(token:string|undefined) {
  if (!token) {
    return null;
  }

  try {
    const payload = verifyAuthToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
    });

    if (!user) {
      return null;
    }

    if (user.status !== "ACTIVE") {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}