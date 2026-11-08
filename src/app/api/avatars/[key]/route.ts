import { prisma } from "@/lib/prisma";
export async function GET(request:Request,context:{params:Promise<{key:string}>}) {
  const {key}=await context.params;
  const large=new URL(request.url).searchParams.get("size")==="300";
  const image=await prisma.avatarThumbnail.findUnique({where:{key},select:{large:large,small:!large}});
  const bytes=image && (large?image.large:image.small);
  if(!bytes)return new Response(null,{status:404});
  return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"image/webp","Cache-Control":"public, max-age=31536000, immutable"}});
}
