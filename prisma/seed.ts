import { PrismaClient, GlobalRole, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: {
      email: "admin@test.com",
    },
    update: {},
    create: {
      firstName: "Diego",
      lastName: "Test",
      email: "admin@test.com",
      passwordHash: "TEMP_PASSWORD",
      globalRole: GlobalRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log("Usuario creado:", user);
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });