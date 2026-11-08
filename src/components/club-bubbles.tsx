"use client";
import {AvatarImage} from "@/components/avatar-image";
import { useEffect,useRef,useState } from "react";
import Link from "next/link";
import { Icon } from "./ui";
type Club={id:string;name:string;logoUrl:string|null};
type Ball={x:number;y:number;vx:number;vy:number};
export function ClubBubbles(){
  const [clubs,setClubs]=useState<Club[]>([]);
  const canvas=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/catalog/bubbles",{signal:controller.signal}).then(r=>r.json()).then(data=>setClubs(data.clubs||[])).catch(()=>{});
    return ()=>controller.abort();
  },[]);
  useEffect(()=>{
    const box=canvas.current!;
    const nodes=Array.from(box.children) as HTMLElement[];
    const motion=matchMedia("(prefers-reduced-motion: reduce)");
    let frame=0,last=0,diameter=0,width=0,height=0,balls:Ball[]=[];
    function place(){
      width=box.clientWidth;height=box.clientHeight;
      const columns=width/height>=1.4?4:3;
      const rows=Math.ceil(nodes.length/columns);
      const cellWidth=width/columns,cellHeight=height/rows;
      diameter=Math.min(116,cellWidth*.94,cellHeight*.94);
      box.style.setProperty("--bubble-size",diameter+"px");
      const slots=Array.from({length:columns*rows},(_,index)=>index);
      balls=nodes.map(()=>{
        const slot=slots.splice(Math.floor(Math.random()*slots.length),1)[0];
        const angle=Math.random()*2*Math.PI;
        return {x:(slot%columns)*cellWidth+Math.random()*(cellWidth-diameter),y:Math.floor(slot/columns)*cellHeight+Math.random()*(cellHeight-diameter),vx:Math.cos(angle)*36,vy:Math.sin(angle)*36};
      });
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
  },[clubs]);
  return <div ref={canvas} className="club-bubbles" aria-label="Explorar clubes">{Array.from({length:7},(_,i)=>{
    const c=clubs[i],name=c?.name||"Club "+(i+1);
    const content=<><span className="bubble-photo">{c?.logoUrl?<AvatarImage src={c.logoUrl} alt=""/>:<Icon name="users" size={30}/>}</span><strong>{name}</strong></>;
    return <div className="bubble-position" key={i}>{c?<Link href={"/explore/"+c.id} title={name}>{content}</Link>:<span>{content}</span>}</div>;
  })}</div>;
}
