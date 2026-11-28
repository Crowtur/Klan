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
export type GeocodingResult={types?:string[];address_components:AddressComponent[]};
export const OUTSIDE_ECUADOR="Esta ubicación está fuera del Ecuador";
/** El rectángulo sólo descarta puntos lejanos; la pertenencia final se valida con el país devuelto por Google. */
export function possibleEcuador({latitude:lat,longitude:lng}:Coordinates) {
  return Number.isFinite(lat)&&Number.isFinite(lng)&&((lat>=-5.2&&lat<=1.8&&lng>=-81.3&&lng<=-75)||(lat>=-1.6&&lat<=1.9&&lng>=-92.2&&lng<=-89));
}
// Algunas fuentes clasifican esta parroquia urbana de Quito como una localidad.
export function municipality(name:string) {
  return /^(?:el )?comité del pueblo$/iu.test(name.trim()) ? "Quito" : name.trim();
}

/** Busca primero una localidad identificada como ciudad y descarta componentes de barrio o parroquia. */
export function cityInEcuador(results:GeocodingResult[],includeCanton=true) {
  const country=(r:GeocodingResult)=>r.address_components.find(c=>c.types.includes("country"))?.short_name;
  if(!results[0]||country(results[0])!=="EC")throw Error(OUTSIDE_ECUADOR);
  const national=results.filter(r=>country(r)==="EC");
  const sector=(t:string)=>t==="neighborhood"||t.startsWith("sublocality")||/^administrative_area_level_[3-9]$/.test(t);
  const sectors=new Set(national.flatMap(r=>r.address_components.filter(c=>c.types.some(sector)).map(c=>c.long_name.trim().toLocaleLowerCase("es"))));
  // Para elegir la ciudad más cercana, un cantón por sí solo no confirma la localidad del marcador.
  for(const type of (includeCanton?["locality","postal_town","administrative_area_level_2"]:["locality","postal_town"])){
    const ordered=[...national.filter(r=>r.types?.includes(type)),...national.filter(r=>!r.types?.includes(type))];
    for(const result of ordered){
      const name=result.address_components.find(c=>c.types.includes(type)&&!c.types.some(sector))?.long_name.trim();
      if(name&&!sectors.has(name.toLocaleLowerCase("es")))return municipality(name.replace(/^cantón\s+/iu,""));
    }
  }
  // Sin localidad directa, el servidor resuelve el punto con el catálogo nacional.
  return "";
}
