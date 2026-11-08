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
import Link from "next/link";
import { useData, Status, Form, money, href, Badge, type Row } from "./common";
import { EditorModal } from "./modal";
/** Consulta el período seleccionado y enlaza cada liquidación con su desglose individual. */
export function GlobalFinances({ year, month, version, onDone }: {
    year: string;
    month: string;
    version: number;
    onDone: () => void;
}) {
    const state = useData("/api/admin/dashboard/finances?" + new URLSearchParams({ year, month }), version), d = state.data;
    return <Status state={state}>{d && <><div className="metrics-grid">{[["Ingresos brutos", d.summary.grossRevenue], ["Comisiones", d.summary.estimatedFees.total], ["Neto para clubes", d.summary.estimatedClubNet], ["Pendiente de abonar", d.settlements.pendingTransferNet]].map(([title, value]) => <dl key={title} className="metric-card"><dt>{title}</dt><dd>{money(value)}</dd></dl>)}</div><section className="panel"><div className="list-heading"><h2>Finanzas por club</h2><EditorModal title="Generar liquidación"><Form url="/api/admin/settlements" onDone={onDone} initial={{ year: Number(year), month: Number(month) }} fields={[{ name: "clubId", label: "Club", options: d.financesByClub.map((r: Row) => ({ value: r.clubId, label: r.clubName })), required: true }, { name: "year", label: "Año", type: "number", min: 2000, required: true }, { name: "month", label: "Mes", type: "number", min: 1, max: 12, required: true }]} submit="Generar liquidación"/></EditorModal></div><div className="table-scroll"><table><thead><tr>{["Club", "Pagos", "Bruto", "Comisiones", "Neto estimado"].map(t => <th className={t==="Club"?undefined:"numeric"} key={t}>{t}</th>)}</tr></thead><tbody>{d.financesByClub.map((r: Row) => <tr key={r.clubId}><td>{r.clubName}</td><td className="numeric">{r.paidPayments}</td><td className="numeric">{money(r.grossRevenue)}</td><td className="numeric">{money(r.totalFees)}</td><td className="numeric">{money(r.estimatedClubNet)}</td></tr>)}</tbody></table></div></section><section className="panel"><h2>Liquidaciones del período</h2><div className="table-scroll"><table><thead><tr><th>Club</th><th className="numeric">Bruto</th><th className="numeric">Comisiones</th><th className="numeric">Neto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{d.settlements.records.map((r: Row) => <tr key={r.id}><td>{r.clubName}</td><td className="numeric">{money(r.grossAmount)}</td><td className="numeric">{money(r.totalFees)}</td><td className="numeric">{money(r.netAmount)}</td><td><Badge value={r.status}/></td><td><Link href={href("settlement", { id: r.id })}>Ver detalle →</Link></td></tr>)}</tbody></table>{!d.settlements.records.length && <p>Todavía no hay liquidaciones para este período.</p>}</div></section></>}</Status>;
}
