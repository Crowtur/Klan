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
import {useSearchParams} from "next/navigation";
import {useEffect} from "react";
import {Dashboard} from "./dashboard";

const key = "klubo:admin-filters";
type Filters = {section:string;period:string};

/** Acepta únicamente las secciones conocidas y períodos mensuales dentro del intervalo permitido. */
function valid(section:string|null, period:string|null): Filters|null {
  if (section !== "resumen" && section !== "finanzas-liquidacion") return null;
  if (!period || !/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(period)) return null;
  return {section:section === "resumen" ? "overview" : "finances", period};
}
/** Recuerda la selección en esta pestaña, incluso cuando se abandona el módulo de administración. */
function storeFilters(filters:Filters) {
  try {sessionStorage.setItem(key,JSON.stringify(filters));} catch {}
}
/** Actualiza juntos la URL y el estado guardado para que el historial recupere los mismos filtros. */
function navigate(filters:Filters) {
  const url = new URL(window.location.href);
  url.searchParams.set("seccion",filters.section === "finances" ? "finanzas-liquidacion" : "resumen");
  url.searchParams.set("periodo",filters.period);
  storeFilters(filters);
  window.history.replaceState(null,"",url);
}

/** Da prioridad a los filtros de la URL y recupera los de la sesión al volver desde el menú. */
export function GlobalDashboard() {
  const query = useSearchParams();
  const section = query.get("seccion"), period = query.get("periodo");
  useEffect(()=>{
    // Al volver con el navegador, la URL histórica prevalece sobre la última combinación guardada en esta pestaña.
    const fromUrl = valid(section,period);
    if (fromUrl) {storeFilters(fromUrl);return;}
    const fallback = {section:"overview",period:new Date().toLocaleDateString("en-CA",{timeZone:"America/Guayaquil"}).slice(0,7)};
    try {
      const cached = JSON.parse(sessionStorage.getItem(key) || "null");
      if (cached && ["overview","finances"].includes(cached.section) && valid("resumen",cached.period)) {
        navigate(cached);return;
      }
    } catch {}
    navigate(fallback);
  },[section,period]);
  const filters = valid(section,period);
  return filters ? <Dashboard filters={filters} onFilters={navigate}/> : null;
}
