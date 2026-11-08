import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  const clubs = await prisma.$queryRaw<{id:string;name:string;logoUrl:string|null}[]>
    `SELECT id, name, "logoUrl" FROM "Club" WHERE status = 'ACTIVE' ORDER BY random() LIMIT 7`;
  return Response.json({clubs},{headers:{"Cache-Control":"no-store"}});
}
