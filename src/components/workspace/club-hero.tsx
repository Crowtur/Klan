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

import {AvatarImage} from "@/components/avatar-image";
import {Icon,PLACEHOLDER_IMAGE} from "@/components/ui";
import {safeUrl,type Row} from "./common";
import {Location} from "./location";
/** Combina portada, logotipo e indicadores en la misma cabecera para la ficha interna y la pública. */
export function ClubHero({club}:{club?:Row}){
  return <header className="club-hero"><img className="hero-cover" src={safeUrl(club?.coverUrl)||PLACEHOLDER_IMAGE} alt="Portada del club"/>
    <div className="hero-identity"><span className="hero-logo">{safeUrl(club?.logoUrl)?<AvatarImage src={safeUrl(club?.logoUrl)} alt=""/>:<Icon name="users" size={38}/>}</span>
    <div><h1>{club?.name||"Club"}</h1><p>{club?.description}</p><Location value={club?.address}/>{safeUrl(club?.googleMapsUrl)&&<a href={safeUrl(club?.googleMapsUrl)} target="_blank" rel="noreferrer">Ver en Google Maps ↗</a>}</div>
    <aside>{club?.createdAt&&<small>DESDE {new Date(club.createdAt).getFullYear()}</small>}<strong>{club?._count?.memberships??"—"}</strong><span>Miembros</span></aside></div></header>
}
