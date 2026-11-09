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

"use client";
import {useEffect,useRef,useState} from "react";
import {avatarSources} from "@/components/avatar-image";
import {Icon,PLACEHOLDER_IMAGE} from "@/components/ui";
import {safeUrl,type Row} from "./common";
import {Location} from "./location";

/** La imagen decodificada es el mismo nodo que se coloca en la cabecera. */
function preload(source:ReturnType<typeof avatarSources>,signal:AbortSignal) {
  return new Promise<HTMLImageElement|null>(resolve=>{
    if(signal.aborted) { resolve(null); return; }
    const image=new Image();
    function finish(result:HTMLImageElement|null) {
      clearTimeout(timer);
      signal.removeEventListener("abort",cancel);
      image.onload=null;
      image.onerror=null;
      resolve(result);
    }
    function cancel() { finish(null); }
    const timer=window.setTimeout(cancel,6000);
    signal.addEventListener("abort",cancel,{once:true});
    image.alt="";
    image.decoding="async";
    image.onerror=cancel;
    image.onload=async()=>{
      try {
        if(image.decode) await image.decode();
        finish(signal.aborted ? null : image);
      } catch { cancel(); }
    };
    if(source.sizes) image.sizes=source.sizes;
    if(source.srcSet) image.srcset=source.srcSet;
    image.src=source.src;
  });
}

/** Combina portada, logotipo e indicadores en la misma cabecera para la ficha interna y la pública. */
export function ClubHero({club}:{club?:Row}){
  const coverHost=useRef<HTMLSpanElement>(null);
  const logoHost=useRef<HTMLSpanElement>(null);
  const id=club?.id;
  const cover=safeUrl(club?.coverUrl)||PLACEHOLDER_IMAGE;
  const logo=safeUrl(club?.logoUrl);
  const [shown,setShown]=useState<{id:string;cover:string;logo?:string}|null>(null);
  const ready=!!id && !!shown && shown.id===id && shown.cover===cover && shown.logo===logo;

  useEffect(()=>{
    if(!id) return;
    const controller=new AbortController();
    const {signal}=controller;
    async function prepare(){
      const coverTask=preload({src:cover},signal).then(image=>{
        if(image || cover===PLACEHOLDER_IMAGE || signal.aborted) return image;
        return preload({src:PLACEHOLDER_IMAGE},signal);
      });
      const [banner,avatar]=await Promise.all([
        coverTask,logo ? preload(avatarSources(logo),signal) : null
      ]);
      if(signal.aborted) return;
      if(banner) coverHost.current?.replaceChildren(banner);
      else coverHost.current?.replaceChildren();
      if(avatar) logoHost.current?.replaceChildren(avatar);
      else logoHost.current?.replaceChildren();
      setShown({id,cover,logo});
    }
    void prepare();
    return ()=>controller.abort();
  },[id,cover,logo]);

  // Si el texto supera la altura reservada en móvil, ofrecer expansión manual sin mover la ficha al hidratar.
  const copy = useRef<HTMLDivElement>(null);
  const [expanded,setExpanded] = useState(false);
  const [longCopy,setLongCopy] = useState(false);
  useEffect(() => {
    const node = copy.current;
    if (!node) return;
    /** Medir también al rotar o cambiar el tamaño de letra, utilizando la misma unidad rem que el CSS. */
    const measure = () => setLongCopy(node.scrollHeight > 8 * parseFloat(getComputedStyle(document.documentElement).fontSize) + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, [club?.name,club?.description,club?.address,club?.googleMapsUrl]);
  const maps=safeUrl(club?.googleMapsUrl);
  return <header className="club-hero" data-ready={ready} aria-busy={!ready} aria-label={ready ? club?.name : "Cargando club"}>
    <div className="hero-cover hero-media-slot" aria-hidden="true">
      <span className="hero-final hero-image-host" ref={coverHost}/>
      <span className="hero-placeholder hero-banner-skeleton"/>
    </div>
    <div className="hero-identity">
      <span className="hero-logo hero-media-slot" aria-hidden="true">
        <Icon name="users" size={38}/>
        <span className="hero-final hero-image-host" ref={logoHost}/>
        <span className="hero-placeholder hero-logo-skeleton"/>
      </span>
      <div className="hero-copy-slot" data-expanded={expanded}>
        <div ref={copy} className="hero-final hero-copy" inert={!ready} onFocusCapture={() => {
          // Si un enlace queda fuera de la porción visible, tabular hacia él revela el texto completo.
          if (longCopy && window.matchMedia("(width < 768px)").matches) setExpanded(true);
        }}>
          <h1>{club?.name}</h1>
          {club?.description && <p>{club.description}</p>}
          <Location value={club?.address}/>
          {maps && <a href={maps} target="_blank" rel="noreferrer">Ver en Google Maps ↗</a>}
        </div>
        <div className="hero-placeholder hero-lines" aria-hidden="true"><i/><i/><i/></div>
      </div>
      {/* Móvil: la fila solo ocupa espacio si el texto largo necesita el control de expansión. */}
      <div className="hero-more">{ready && longCopy && <button type="button" aria-expanded={expanded}
          onClick={()=>setExpanded(value=>!value)}>{expanded ? "Ver menos" : "Ver información completa"}</button>}</div>
      <aside className="hero-count-slot">
        <div className="hero-final" inert={!ready}>
          {club?.createdAt && <small>DESDE {new Date(club.createdAt).getFullYear()}</small>}
          <strong>{club?._count?.memberships??"—"}</strong><span>Miembros</span>
        </div>
        <div className="hero-placeholder hero-lines" aria-hidden="true"><i/><i/></div>
      </aside>
    </div>
  </header>;
}
