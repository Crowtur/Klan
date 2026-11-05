type Notice={type:string;clubId?:string|null;targetPath?:string|null};
export function notificationDestination(n:Notice){
 if(["APPLICATION_SUBMITTED","DOCUMENTS_SUBMITTED"].includes(n.type))return {scope:"club",tab:"applications",path:`/app?view=club&club=${encodeURIComponent(n.clubId||"")}&tab=applications`};
 if(/^(APPLICATION|DOCUMENT)_/.test(n.type))return {scope:"personal",tab:"applications",path:"/app?view=applications"};
 if(n.type.startsWith("SETTLEMENT"))return {scope:"club",tab:"overview",path:`/app?view=club&club=${encodeURIComponent(n.clubId||"")}&tab=overview`};
 if(n.type.startsWith("RESERVATION"))return {scope:"club",tab:"reservations",path:`/app?view=club&club=${encodeURIComponent(n.clubId||"")}&tab=reservations`};
 return {scope:"personal",tab:"memberships",path:n.targetPath||"/app?view=memberships"};
}
export function notificationTitle(n:Notice & {title:string}){return n.type==="DOCUMENTS_SUBMITTED" && n.title==="Documentación enviada"?"Documentación recibida para revisión":n.type==="APPLICATION_SUBMITTED"?"Nueva solicitud de ingreso recibida":n.title;}
export function relativeTime(value:string,now=Date.now()){
 const seconds=Math.max(0,Math.floor((now-Date.parse(value))/1000));
 if(!Number.isFinite(seconds))return "Fecha no disponible";
 for(const [size,name] of [[31536000,"año"],[2592000,"mes"],[604800,"semana"],[86400,"día"],[3600,"hora"],[1,"segundo"]] as const){if(seconds>=size || size===1){const n=Math.floor(seconds/size);return `Hace ${n} ${name}${n===1?"":name==="mes"?"es":"s"}`;}}
 return "Hace 0 segundos";
}
