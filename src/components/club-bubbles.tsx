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
import {AvatarImage} from "@/components/avatar-image";
import { useEffect,useRef,useState } from "react";
import { useMobile } from "./use-mobile";
import Link from "next/link";
import { Icon } from "./ui";
type Club={id:string;name:string;logoUrl:string|null};
type Ball={x:number;y:number;vx:number;vy:number};
/** Distribuye los clubes de la portada en posiciones animadas y conserva marcadores mientras carga el catálogo. */
export function ClubBubbles(){
  // Móvil (<768 px): reservar cinco plazas incluso antes de cargar el catálogo. Cada plaza conserva su clave al recibir el logo.
  const mobile = useMobile();
  const slotCount = mobile ? 5 : 7;
  const [clubs,setClubs]=useState<Club[]>([]);
  // El corte solo selecciona datos; la respuesta HTTP no reinicia la animación ni modifica el número de plazas.
  const visibleClubs = clubs.slice(0,slotCount);
  const physics=useRef<Ball[]>([]);
  const canvas=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/catalog/bubbles",{signal:controller.signal}).then(r=>r.json()).then(data=>setClubs(data.clubs||[])).catch(()=>{});
    return ()=>controller.abort();
  },[]);
  useEffect(()=>{
    // Las cinco trayectorias móviles están delimitadas por CSS. El motor original solo mueve las siete de escritorio.
    // Comprobar también la media query evita arrancar ese motor durante la primera hidratación en un teléfono.
    if (mobile || window.matchMedia("(width < 768px)").matches) {
      physics.current = [];
      return;
    }
    const box=canvas.current!;
    const nodes=Array.from(box.children) as HTMLElement[];
    const motion=matchMedia("(prefers-reduced-motion: reduce)");
    const balls=physics.current;
    let frame=0,last=0,diameter=0,width=0,height=0;
    function place(){
      const nextWidth=box.clientWidth,nextHeight=box.clientHeight;
      if (!nextWidth || !nextHeight || (width===nextWidth && height===nextHeight)) return;
      const previousX=width-diameter,previousY=height-diameter;
      width=nextWidth;height=nextHeight;
      const columns=width/height>=1.4?4:3;
      const rows=Math.ceil(nodes.length/columns);
      const cellWidth=width/columns,cellHeight=height/rows;
      diameter=Math.min(116,cellWidth*.94,cellHeight*.94);
      box.style.setProperty("--bubble-size",diameter+"px");
      // Un cambio real de tamaño adapta las posiciones al espacio disponible y conserva las velocidades.
      if (balls.length) {
        for (const ball of balls) {
          if(previousX>0) ball.x*= (width-diameter)/previousX;
          if(previousY>0) ball.y*= (height-diameter)/previousY;
        }
        paint();
        return;
      }
      const slots=Array.from({length:columns*rows},(_,index)=>index);
      balls.push(...nodes.map(()=>{
        const slot=slots.splice(Math.floor(Math.random()*slots.length),1)[0];
        const angle=Math.random()*2*Math.PI;
        return {x:(slot%columns)*cellWidth+Math.random()*(cellWidth-diameter),y:Math.floor(slot/columns)*cellHeight+Math.random()*(cellHeight-diameter),vx:Math.cos(angle)*36,vy:Math.sin(angle)*36};
      }));
      paint();
    }
    function paint(){balls.forEach((b,i)=>nodes[i].style.transform=`translate3d(${b.x}px,${b.y}px,0)`)}
    function tick(time:number){
      const dt=Math.min((time-last)/1000,.032);last=time;
      const held=nodes.map(n=>n.matches(":hover,:focus-within"));
      balls.forEach((b,i)=>{if(!held[i]){b.x+=b.vx*dt;b.y+=b.vy*dt;}});
      for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
        const a=balls[i],b=balls[j],dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy)||.01;
        if(dist>=diameter || held[i]&&held[j])continue;
        const nx=dx/dist,ny=dy/dist,overlap=diameter-dist;
        const wa=held[i]?0:held[j]?1:.5,wb=1-wa;
        a.x-=nx*overlap*wa;a.y-=ny*overlap*wa;b.x+=nx*overlap*wb;b.y+=ny*overlap*wb;
        const impulse=((held[i]?0:a.vx)-(held[j]?0:b.vx))*nx+((held[i]?0:a.vy)-(held[j]?0:b.vy))*ny;
        if(impulse>0){a.vx-=2*wa*impulse*nx;a.vy-=2*wa*impulse*ny;b.vx+=2*wb*impulse*nx;b.vy+=2*wb*impulse*ny;}
      }
      balls.forEach(b=>{
        if(b.x<0 || b.x>width-diameter)b.vx=b.x<0?Math.abs(b.vx):-Math.abs(b.vx);
        if(b.y<0 || b.y>height-diameter)b.vy=b.y<0?Math.abs(b.vy):-Math.abs(b.vy);
        b.x=Math.max(0,Math.min(width-diameter,b.x));b.y=Math.max(0,Math.min(height-diameter,b.y));
      });
      paint();frame=requestAnimationFrame(tick);
    }
    function start(){cancelAnimationFrame(frame);if(!motion.matches&&!document.hidden)frame=requestAnimationFrame(tick)}
    const resize=new ResizeObserver(place);resize.observe(box);place();start();
    motion.addEventListener("change",start);document.addEventListener("visibilitychange",start);
    return ()=>{resize.disconnect();cancelAnimationFrame(frame);motion.removeEventListener("change",start);document.removeEventListener("visibilitychange",start)};
  },[mobile]);
  return <div ref={canvas} className="club-bubbles" aria-label="Explorar clubes">{Array.from({length:slotCount},(_,i)=>{
    const c=visibleClubs[i],name=c?.name||"Club "+(i+1);
    const content=<><BubblePhoto key={c?.logoUrl || "placeholder"} src={c?.logoUrl}/><strong>{name}</strong></>;
    return <div className="bubble-position" key={i}>{c?<Link href={"/explore/"+c.id} title={name}>{content}</Link>:<span>{content}</span>}</div>;
  })}</div>;
}

/** El logo se descarga bajo el marcador. El navegador elige la miniatura y solo se muestra tras la carga. */
function BubblePhoto({src}:{src?:string|null}) {
  const [ready,setReady]=useState(false);
  return <span className="bubble-photo" data-ready={ready}>
    <Icon name="users" size={30}/>
    {src && <AvatarImage src={src} alt="" loading="eager" decoding="async"
      onLoad={()=>setReady(true)} onError={()=>setReady(false)}/>}
  </span>;
}
