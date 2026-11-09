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
import { useState } from "react";
import { Badge, Status, Pager, useData, money, date, type Row } from "./common";
import { PageHeading } from "@/components/ui";
/** Construye una consulta común para el historial y su CSV. Cada pago completado abre el comprobante de su propietario. */
export function PaymentHistory() {
    const [page, setPage] = useState(1), [club, setClub] = useState(""), [status, setStatus] = useState(""), [year, setYear] = useState(String(new Date().getFullYear()));
    const clubs = useData("/api/me/memberships");
    const query = new URLSearchParams({ page: String(page), limit: "10", year, ...(club && { clubId: club }), ...(status && { status }) });
    const state = useData("/api/me/payments?" + query);
    const data = state.data, summary = data?.summary;
    // Móvil: data-label conserva el encabezado de cada valor al distribuir las filas como fichas.
    return <><PageHeading eyebrow="Mi cuenta / Pagos" title="Historial de pagos" description="Consulta cada cobro y accede al detalle de tus pagos en los clubes." action={<a className="btn btn-outline" href={"/api/me/payments?" + query + "&format=csv"}>↓ Exportar CSV</a>}/>
 <div className="metrics-grid">{[["Total pagado · " + year, money(summary?.paid?._sum?.amount ?? 0)], ["Pendiente de pago", money(summary?.pendingByClub?.reduce((sum: number, r: Row) => sum + Number(r._sum.amount), 0) ?? 0)], ["Último pago completado", summary?.lastPaid ? money(summary.lastPaid.amount) : "—"]].map(([k, v]) => <dl className="metric-card" key={k}><dt>{k}</dt><dd>{v}</dd></dl>)}</div>
 <p className="muted">{summary?.paid?._count ?? 0} pagos completados · Último pago {date(summary?.lastPaid?.paidAt)} · {summary?.lastPaid?.club?.name}</p>{summary?.pendingByClub?.length > 0 && <div className="notice">{summary.pendingByClub.map((p: Row) => <p key={p.clubId}>{clubs.data?.memberships.find((m: Row) => m.club.id === p.clubId)?.club.name || "Club"} · {money(p._sum.amount)} pendiente</p>)}</div>}
 <section className="panel"><div className="list-heading"><h2>Todos los movimientos</h2><div className="actions"><label>Club<select value={club} onChange={e => { setClub(e.target.value); setPage(1); }}><option value="">Todos los clubes</option>{clubs.data?.memberships.map((m: Row) => <option key={m.club.id} value={m.club.id}>{m.club.name}</option>)}</select></label><label>Estado<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Todos los estados</option>{["PAID", "PENDING", "PROCESSING", "FAILED", "CANCELLED", "REFUNDED"].map(s => <option key={s} value={s}>{({ PAID: "Pagado", PENDING: "Pendiente", PROCESSING: "En proceso", FAILED: "Fallido", CANCELLED: "Cancelado", REFUNDED: "Reembolsado" } as Record<string, string>)[s]}</option>)}</select></label><label>Año<input type="number" min="2000" max="2100" value={year} onChange={e => { setYear(e.target.value); setPage(1); }}/></label></div></div>
 <Status state={state}><div className="table-scroll"><table><thead><tr>{["Club", "Plan", "Importe", "Moneda", "Estado", "Fecha", "Acciones"].map(s => <th className={s==="Importe"?"numeric":undefined} key={s}>{s}</th>)}</tr></thead><tbody>{data?.payments.map((p: Row) => <tr key={p.id}><td data-label="Club"><strong>{p.club.name}</strong><small style={{ display: "block" }}>{p.id.slice(0, 12)}</small></td><td data-label="Plan">{p.subscription?.plan.name}</td><td data-label="Importe" className="numeric">{Number(p.amount).toFixed(2)}</td><td data-label="Moneda">USD</td><td data-label="Estado"><Badge value={p.status}/></td><td data-label="Fecha">{date(p.paidAt ?? p.createdAt)}</td><td data-label="Acciones">{p.status === "PAID" ? <a href={`/api/payments/${encodeURIComponent(p.id)}/receipt`} target="_blank" rel="noopener noreferrer">Ver detalle ↗</a> : "—"}</td></tr>)}</tbody></table>{data?.payments.length === 0 && <p>No hay pagos para estos filtros.</p>}</div><Pager data={data} page={page} onPage={setPage}/></Status></section></>;
}
