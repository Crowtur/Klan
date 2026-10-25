import { prisma } from "@/lib/prisma";
import { ClubRole } from "@prisma/client";

export async function getClubMembership(
  userId: string,
  clubId: string
) {
  return prisma.clubMembership.findUnique({
    where: {
      userId_clubId: {
        userId,
        clubId,
      },
    },
    include: {
      club: true,
    },
  });
}

export async function requireClubMembership(
  userId: string,
  clubId: string
) {
  const membership = await getClubMembership(userId, clubId);

  if (!membership) {
    throw new Error("FORBIDDEN");
  }

  if (membership.status !== "ACTIVE") {
    throw new Error("FORBIDDEN");
  }

  if (membership.club.status !== "ACTIVE") {
    throw new Error("FORBIDDEN");
  }

  return membership;
}

export async function requireClubAdmin(
  userId: string,
  clubId: string
) {
  const membership = await requireClubMembership(
    userId,
    clubId
  );

  if (membership.role !== ClubRole.CLUB_ADMIN) {
    throw new Error("FORBIDDEN");
  }

  return membership;
}

export async function requireSuperAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("FORBIDDEN");
  }

  if (user.globalRole !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export async function requireClubSuspensionPermission(
  userId: string,
  clubId: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      globalRole: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new Error("FORBIDDEN");
  }

  // Un SUPER_ADMIN puede suspender cualquier club.
  if (user.globalRole === "SUPER_ADMIN") {
    return;
  }

  // Un CLUB_ADMIN solo puede suspender su propio club.
  const membership = await prisma.clubMembership.findUnique({
    where: {
      userId_clubId: {
        userId,
        clubId,
      },
    },
  });

  if (
    !membership ||
    membership.status !== "ACTIVE" ||
    membership.role !== "CLUB_ADMIN"
  ) {
    throw new Error("FORBIDDEN");
  }
}