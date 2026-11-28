/**
 * ==============================================================================
 * PONTIFICIA UNIVERSIDAD CATÓLICA DEL ECUADOR
 * Facultad Internacional de Innovación (PUCE - Icam)
 * ==============================================================================
 * 
 * PROYECTO DE TITULACIÓN - INGENIERÍA INTEGRAL
 * Autor: Diego Alexis Tipán Zambrano
 * Director del Proyecto: PhD. Rafael Melgarejo
 * Promoción: Primera Promoción (Año 2026)
 * 
 * ------------------------------------------------------------------------------
 * DECLARACIÓN SOBRE EL USO DE INTELIGENCIA ARTIFICIAL
 * ------------------------------------------------------------------------------
 * Se declara formalmente el uso de herramientas de Inteligencia Artificial como
 * soporte y asistente técnico para el desarrollo de este proyecto, destacando su
 * aplicación en:
 * 
 * - Generación y optimización de bloques de código repetitivos y extensos.
 * - Desarrollos de endpoints complejos con variabilidad de permisos y roles.
 * - Integración de nuevas funciones y sugerencias de arquitectura de software.
 * - Depuración ágil, corrección de errores y optimización de rendimiento.
 * - Creación, maquetación e integración de diseños UI/UX de formato visual a código.
 * - Automatización de documentación técnica y estructuración de comentarios.
 * 
 * Herramientas de IA utilizadas:
 * - GPT-5.6 Luna
 * - GPT-6 Astra
 * - Gemini 3.6 Flash
 * - Figma AI (Visual Engine / Make Real)
 * 
 * ------------------------------------------------------------------------------
 * DERECHOS DE AUTOR Y PROPIEDAD INTELECTUAL
 * ------------------------------------------------------------------------------
 * Los derechos del presente proyecto corresponden a la Pontificia Universidad
 * Católica del Ecuador junto al autor y al director del proyecto, en estricto
 * cumplimiento del reglamento institucional sobre patentes, tesis y titulación.
 * 
 * ALCANCE: Dichos derechos aplican exclusivamente al código fuente desarrollado
 * en este proyecto, excluyendo la idea de negocio global y futuras versiones 
 * o derivados sustanciales que puedan desarrollarse sobre el sistema.
 * ==============================================================================
 */

/** Reconoce enlaces antes que etiquetas para no convertir fragmentos de URL en hashtags. Nunca interpreta HTML. */
export type PostToken = { kind: "text" | "url" | "hashtag"; text: string; value: string };
export function normalizeHashtag(value: string) { return value.normalize("NFC").toLocaleLowerCase("es"); }
export function tokenizePost(value: string): PostToken[] {
  const tokens: PostToken[] = [];
  const matcher = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|(?<![\p{L}\p{N}_])#[\p{L}\p{M}\p{N}_]+/giu;
  let end = 0;
  for (const match of value.matchAll(matcher)) {
    const start = match.index!;
    if (start > end) tokens.push({ kind: "text", text: value.slice(end, start), value: "" });
    let text = match[0];
    if (text.startsWith("#")) {
      const tag = normalizeHashtag(text.slice(1));
      tokens.push({ kind: Array.from(tag).length <= 64 ? "hashtag" : "text", text, value: tag });
    } else {
      text = text.replace(/[.,;:!?]+$/u, "");
      for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
        while (text.endsWith(close) && text.split(close).length > text.split(open).length) text = text.slice(0, -1);
      }
      try {
        const url = new URL(/^www\./i.test(text) ? "https://" + text : text);
        tokens.push({ kind: url.username || url.password ? "text" : "url", text, value: url.href });
      } catch { tokens.push({ kind: "text", text, value: "" }); }
    }
    end = start + text.length;
  }
  if (end < value.length) tokens.push({ kind: "text", text: value.slice(end), value: "" });
  return tokens;
}
export function extractHashtags(...text: (string | null | undefined)[]) {
  return [...new Set(text.flatMap(t => tokenizePost(t || "").filter(t => t.kind === "hashtag").map(t => t.value)))].sort();
}
export function firstPostLink(title?: string | null, content?: string | null) {
  return tokenizePost((title || "") + "\n" + (content || "")).find(t => t.kind === "url")?.value;
}
/** Sólo construye iframes de proveedores conocidos y de identificadores con formato válido. */
export function videoEmbed(value: string): { provider: string; src: string } | null {
  let url: URL; try { url = new URL(value); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  const youtube = ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host);
  const id = host === "youtu.be" ? parts[0] : youtube ? (url.searchParams.get("v") || (["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : "")) : "";
  if (id && /^[\w-]{11}$/.test(id)) return { provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` };
  if (["instagram.com", "m.instagram.com"].includes(host) && ["p", "reel", "reels", "tv"].includes(parts[0]) && /^[\w-]+$/.test(parts[1] || "")) return { provider: "Instagram", src: `https://www.instagram.com/p/${parts[1]}/embed/` };
  if (["facebook.com", "m.facebook.com", "fb.watch"].includes(host) && (host === "fb.watch" || /\/(videos|reel|watch)(\/|$)/.test(url.pathname) || url.pathname === "/watch")) return { provider: "Facebook", src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.href)}&show_text=false` };
  if (host === "linkedin.com") {
    let pathname: string; try { pathname = decodeURIComponent(url.pathname); } catch { return null; }
    const urn = pathname.match(/urn:li:(activity|ugcPost|share):(\d+)/);
    const activity = url.pathname.match(/activity-(\d+)/);
    if (urn || activity) return { provider: "LinkedIn", src: `https://www.linkedin.com/embed/feed/update/urn:li:${urn?.[1] || "activity"}:${urn?.[2] || activity?.[1]}` };
  }
  if (["tiktok.com", "m.tiktok.com"].includes(host)) {
    const video = url.pathname.match(/\/(?:video|player\/v1)\/(\d+)/);
    if (video) return { provider: "TikTok", src: `https://www.tiktok.com/player/v1/${video[1]}?autoplay=1` };
  }
  return null;
}
