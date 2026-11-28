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

import cities from "./cities.json";
import type {Coordinates} from "./ecuador";

// Catálogo compartido entre el mapa y el servidor. Cada cabecera conserva provincia, alias y posición.
export const cityCatalog=cities;
export type City=typeof cities[number];
const normalize=(text:string)=>text.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ");
const entries=cities.map(city=>({
  city,
  names:[city.name,...city.aliases].map(normalize),
  province:normalize(city.province),
}));

export function searchCities(input:string,partial=true):City[] {
  const query=normalize(input);
  if(!query)return [];
  const exact=entries.filter(({names,province})=>names.some(name=>name===query || name+", "+province===query));
  if(exact.length || !partial)return exact.map(entry=>entry.city);
  return entries.filter(({names})=>names.some(name=>name.includes(query))).map(entry=>entry.city);
}

/** El término de Haversine ordena las distancias sobre la esfera sin imponer un radio máximo. */
export function nearestCity(point:Coordinates,candidates:City[]=cities):City {
  const radians=Math.PI/180;
  const latitude=point.latitude*radians;
  function distance(city:City){
    const dLat=(city.lat-point.latitude)*radians;
    const dLng=(city.lng-point.longitude)*radians;
    return Math.sin(dLat/2)**2+Math.cos(latitude)*Math.cos(city.lat*radians)*Math.sin(dLng/2)**2;
  }
  return candidates.reduce((nearest,city)=>distance(city)<distance(nearest)?city:nearest);
}
