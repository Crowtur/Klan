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

import jwt from "jsonwebtoken";
import {createHmac} from "node:crypto";
const locationSecret=(secret:string)=>createHmac("sha256",secret).update("klan-location-selection").digest();
import { z } from "zod";
import { OUTSIDE_ECUADOR, possibleEcuador, cityInEcuador, type Coordinates, type GeocodingResult } from "./ecuador";
import country from "./ecuador-map.json";
import {nearestCity,searchCities} from "./city-catalog";
// El contorno local incluye las islas. Los huecos interiores se excluyen al evaluar el punto.
function validateTerritory(point:Coordinates) {
  const {latitude:y,longitude:x}=point;
  function inside(ring:number[][]) {
    let hit=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const [a,b]=ring[i],[c,d]=ring[j];
      if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;
    }
    return hit;
  }
  if(!country.geometry.coordinates.some(p=>inside(p[0])&&!p.slice(1).some(inside)))throw Error(OUTSIDE_ECUADOR);

}
const selection=z.object({latitude:z.number().finite(),longitude:z.number().finite(),address:z.string().max(160),googleMapsUrl:z.string().url()});
/** Firma la selección resuelta en el servidor; el formulario sólo puede corregir la etiqueta de ciudad. */
export async function resolveLocation(point:Coordinates,userId:string) {
  if(!possibleEcuador(point))throw Error(OUTSIDE_ECUADOR);
  validateTerritory(point);
  const key=process.env.GOOGLE_MAPS_SERVER_API_KEY;
  let address:string|undefined;
  if(key){
    const url=new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.search=new URLSearchParams({latlng:`${point.latitude},${point.longitude}`,language:'es',key}).toString();
    let body:{status:string;results:GeocodingResult[]}|undefined;
    try{
      const response=await fetch(url,{signal:AbortSignal.timeout(6000),cache:'no-store'});
      if(response.ok)body=await response.json();
    }catch{
      // Una caída del proveedor activa la misma validación territorial que el modo local.
    }
    if(body?.status==="OK" && Array.isArray(body.results) && body.results[0]?.address_components?.some(c=>c.types.includes("country"))){
      // Un país extranjero explícito se rechaza antes de consultar las cabeceras.
      const locality=cityInEcuador(body.results,false);
      const province=body.results.flatMap(r=>r.address_components).find(c=>c.types.includes("administrative_area_level_1"))?.long_name;
      const matches=searchCities(province ? locality+", "+province.replace(/^provincia de\s+/iu,"") : locality,false);
      address=nearestCity(point,matches.length ? matches : undefined).name;
    }
  }
  address??=nearestCity(point).name;
  const data={...point,address,googleMapsUrl:`https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`};
  const secret=process.env.JWT_SECRET;if(!secret)throw Error('MAPS_NOT_CONFIGURED');
  const token=jwt.sign(data,locationSecret(secret),{algorithm:'HS256',subject:userId,audience:'klan-location',expiresIn:'30m'});
  return {...data,token};
}
export function verifiedLocation(token:unknown,userId:string,manualCity?:unknown) {
  if(typeof token!=='string'||token.length>4096)throw Error('INVALID_LOCATION');
  try {
    const secret=process.env.JWT_SECRET;if(!secret)throw Error('INVALID_LOCATION');
    const payload=jwt.verify(token,locationSecret(secret),{algorithms:['HS256'],subject:userId,audience:'klan-location'});
    const data=selection.parse(payload);
    // Sólo se edita la etiqueta. La posición y el enlace proceden del punto firmado.
    data.address=z.string().trim().min(1).max(160).regex(/^[\p{L}\p{M}\p{N} .’'()–-]+$/u).parse(manualCity === undefined ? data.address : manualCity);
    if(!possibleEcuador(data))throw Error('INVALID_LOCATION');
    // La URL siempre se vuelve a construir a partir de las coordenadas firmadas.
    return {...data,googleMapsUrl:`https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`};
  }catch{throw Error('INVALID_LOCATION');}
}
