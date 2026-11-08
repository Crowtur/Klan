import sharp from "sharp";

export async function renderAvatars(source: Buffer) {
  const image = sharp(source,{limitInputPixels:50_000_000}).rotate();
  const resize = (size:number) => image.clone().resize(size,size,{fit:"cover"}).webp({quality:88}).toBuffer();
  const [small,large] = await Promise.all([resize(128),resize(300)]);
  return {small,large};
}
export async function downloadAvatars(url:string) {
  const response = await fetch(url,{signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw Error("No se pudo procesar la imagen subida");
  return renderAvatars(Buffer.from(await response.arrayBuffer()));
}
