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

import type {ImgHTMLAttributes} from "react";

/** Describe las variantes de tamaño para que el navegador elija una miniatura acorde con la densidad de pantalla. */
export function AvatarImage({src,sizes="80px",...props}:ImgHTMLAttributes<HTMLImageElement>){
  if(typeof src!=="string" || !src)return null;
  if(src.startsWith("/api/avatars/"))return <img {...props} src={src} srcSet={src+" 128w, "+src+"?size=300 300w"} sizes={sizes}/>;
  // Original URLs from earlier versions are resized and cached by Next's image endpoint.
  if(/^https:\/\/(?:[a-z0-9-]+\.ufs\.sh|utfs\.io)\/f\//i.test(src)){
    const variant=(width:number)=>"/_next/image?url="+encodeURIComponent(src)+"&w="+width+"&q=75";
    return <img {...props} src={variant(128)} srcSet={variant(128)+" 128w, "+variant(300)+" 300w"} sizes={sizes}/>;
  }
  return <img {...props} src={src}/>;
}
