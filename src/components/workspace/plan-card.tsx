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

import type { ReactNode } from "react";
import { money, type Row } from "./common";

/** Normaliza beneficios y duración y reserva el pie para las acciones que proporciona cada vista. */
export function PlanCard({ plan, children, showRequirements = false }: {
  plan: Row;
  children: ReactNode;
  showRequirements?: boolean;
}) {
  const duration = Number(plan.durationValue);
  const units: Record<string, string[]> = {
    DAY: ["DÍA", "DÍAS"], MONTH: ["MES", "MESES"], YEAR: ["AÑO", "AÑOS"],
  };
  const unit = units[plan.durationUnit]?.[duration === 1 ? 0 : 1];
  const raw = Array.isArray(plan.benefits) ? plan.benefits : [plan.benefits];
  const benefits = raw.filter((v): v is string => typeof v === "string")
    .flatMap(value => value.split(/\r?\n/))
    .map(value => value.trim().replace(/^[-•✓]\s+/, "")).filter(Boolean);
  const requirements: Row[] = plan.requiresDocumentation ? plan.documentRequirements || [] : [];
  return <article className="membership-plan">
    <header><span className={plan.type === "PAID" ? "plan-pill paid" : "plan-pill"}>{plan.type === "PAID" ? "De pago" : "Gratuito"}</span><small>{duration} {unit}</small></header>
    <h3>{plan.name}</h3><p>{plan.description}</p>
    <strong className="membership-price">{money(plan.price)}</strong>
    <ul>{benefits.map((benefit, index) => <li key={index}><span aria-hidden="true">✓</span>{benefit}</li>)}</ul>
    {showRequirements && requirements.length > 0 && <p>{requirements.map(r => r.name).join(", ")}</p>}
    <footer>
      <div className="plan-meta">
        {plan.activeMembers !== undefined && <span>{plan.activeMembers} {plan.activeMembers === 1 ? "socio" : "socios"}</span>}
        <span>{requirements.length} {requirements.length === 1 ? "requisito documental" : "requisitos documentales"}</span>
      </div>
      {plan.isActive === false && <small>Plan desactivado</small>}
      <div className="plan-actions">{children}</div>
    </footer>
  </article>;
}
