import type { ReactNode } from "react";
import { money, type Row } from "./common";

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
