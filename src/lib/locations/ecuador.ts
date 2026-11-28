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

export type Coordinates={latitude:number;longitude:number};
export type AddressComponent={long_name:string;short_name:string;types:string[]};
export type GeocodingResult={address_components:AddressComponent[]};
export const OUTSIDE_ECUADOR="Esta ubicación está fuera del Ecuador";
/** El rectángulo sólo descarta puntos lejanos; la pertenencia final se valida con el país devuelto por Google. */
export function possibleEcuador({latitude:lat,longitude:lng}:Coordinates) {
  return Number.isFinite(lat)&&Number.isFinite(lng)&&((lat>=-5.2&&lat<=1.8&&lng>=-81.3&&lng<=-75)||(lat>=-1.6&&lat<=1.9&&lng>=-92.2&&lng<=-89));
}
/** Busca la ciudad, nunca sustituye una ciudad ausente por una calle, provincia o país. */
export function cityInEcuador(results:GeocodingResult[]) {
  const country=(r:GeocodingResult)=>r.address_components.find(c=>c.types.includes("country"))?.short_name;
  if(!results[0]||country(results[0])!=="EC")throw Error(OUTSIDE_ECUADOR);
  for(const type of ['locality','postal_town'])for(const result of results){
    if(country(result)!=="EC")continue;
    const city=result.address_components.find(c=>c.types.includes(type))?.long_name?.trim();
    if(city)return city;
  }
  throw Error("No se pudo identificar la ciudad. Elige un punto dentro de una ciudad.");
}
