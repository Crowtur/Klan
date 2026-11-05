"use client";
import {useEffect,useState} from "react";
import {api,type Row} from "./common";
import {notificationDestination} from "@/lib/notification-routing";
export function NoticeCount({club,kind}:{club?:string;kind?:"applications"|"clubs"|"reservations"|"overview"|"members"}){
 const [count,setCount]=useState(0);
 useEffect(()=>{let live=true;const refresh=()=>api("/api/me/notifications"+(club?"?clubId="+encodeURIComponent(club):"")).then(d=>{if(live)setCount((d.byClub||[]).filter((r:Row)=>{const route=notificationDestination(r as any);if(club)return route.scope==="club"&&(!kind||route.tab===kind);if(kind==="applications")return route.scope==="personal"&&route.tab==="applications";return route.scope==="club"}).reduce((n:number,r:Row)=>n+Number(r._count),0))}).catch(()=>{});void refresh();const timer=setInterval(refresh,30000);window.addEventListener("klubo-notifications",refresh);return()=>{live=false;clearInterval(timer);window.removeEventListener("klubo-notifications",refresh)}},[club,kind]);
 return count?<span className="notification-count" aria-label={count+" novedades"}>{count}</span>:null;
}
