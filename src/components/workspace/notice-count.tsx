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
import {useSyncExternalStore} from "react";
import {api} from "./common";
import {notificationDestination} from "@/lib/notification-routing";

type Group = {clubId: string | null; type: string; _count: number};
const empty: Group[] = [];
let groups = empty;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval>;
let generation = 0;
let pending = false;

function refresh() {
  if (pending) return;
  pending = true;
  const current = ++generation;
  void api("/api/me/notifications?summary=1").then(data => {
    if (current !== generation) return;
    groups = data.byClub;
    listeners.forEach(listener => listener());
  }).catch(() => {}).finally(() => {
    if (current === generation) pending = false;
  });
}

function afterRead() {
  pending = false;
  refresh();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    refresh();
    timer = setInterval(refresh, 30000);
    window.addEventListener("klubo-notifications", afterRead);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      window.removeEventListener("klubo-notifications", afterRead);
      generation++;
      pending = false;
      groups = empty;
    }
  };
}

export function useNoticeGroups() {
  return useSyncExternalStore(subscribe, () => groups, () => empty);
}

export function NoticeCount({club,kind}:{club?:string;kind?:"applications"|"clubs"|"reservations"|"overview"|"members"}){
  const count = useNoticeGroups().reduce((sum, group) => {
    if (club && group.clubId !== club) return sum;
    const route = notificationDestination(group);
    const matches = club
      ? route.scope === "club" && (!kind || route.tab === kind)
      : kind === "applications"
        ? route.scope === "personal" && route.tab === "applications"
        : route.scope === "club";
    return matches ? sum + group._count : sum;
  }, 0);
  return count ? <span className="notification-count" aria-label={count+" novedades"}>{count}</span> : null;
}
