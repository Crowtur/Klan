"use client";
import { useState } from "react";
import { useData, Status, money, type Row } from "./common";
const colors = ["#136336", "#34d399", "#66a182", "#ddb66a", "#8b7ab8", "#3c8eaf"];
const monthFormat = new Intl.DateTimeFormat("es-EC", {month:"long",year:"numeric",timeZone:"UTC"});
function monthLabel(key:string) {
    return /^\d{4}-\d{2}$/.test(key) ? monthFormat.format(new Date(key + "-01T12:00:00Z")) : key;
}
export function Bars({title, rows, series, grouped=false, xAxis, yAxis, calendar}: {
    title:string; rows:{label:string;values:number[]}[]; series:string[]; grouped?:boolean;
    xAxis:string; yAxis:string; calendar?:string;
}) {
    const max = Math.max(1, ...rows.map(r => grouped ? Math.max(0,...r.values) : r.values.reduce((a,b)=>a+b,0)));
    const months:{key:string;count:number}[] = [];
    if (calendar === "day") for (const row of rows) {
        const key = row.label.slice(0,7), last = months.at(-1);
        if (last?.key === key) last.count++;
        else months.push({key,count:1});
    }
    const tracks = {gridTemplateColumns: `repeat(${rows.length},minmax(0,1fr))`};
    return <section className="panel chart-panel"><h3>{title}{months.length === 1 && " · " + monthLabel(months[0].key)}</h3>
      {!rows.length ? <p>Sin movimientos en este período.</p> : <>
        <strong className="chart-axis">{yAxis}</strong>
        <div className="chart-scroll"><div style={{minWidth:rows.length * 52}}>
          <div className="chart-bars" style={tracks}>{rows.map(r=><div className="chart-column" key={r.label}>
            <div className={grouped?"bar-stack grouped":"bar-stack"}>{r.values.map((v,i)=><div key={i} style={{height:220*v/max,background:colors[i%colors.length]}} title={series[i]+": "+v}/>)}</div>
            <small>{calendar==="day" ? Number(r.label.slice(8)) : calendar==="month" ? monthLabel(r.label) : r.label}</small>
          </div>)}</div>
          {months.length>1 && <div className="chart-months" style={tracks}>{months.map(m=><span key={m.key} style={{gridColumn:"span "+m.count}}>{monthLabel(m.key)}</span>)}</div>}
        </div></div><strong className="chart-axis horizontal">{xAxis}</strong></>}
      <div className="chart-legend">{series.map((s,i)=><span key={s}><i style={{background:colors[i%colors.length]}}/>{s}</span>)}</div>
      <details><summary>Ver valores</summary><div className="table-scroll"><table><thead><tr><th>{xAxis}</th>{series.map(s=><th className="numeric" key={s}>{s}</th>)}</tr></thead>
        <tbody>{rows.map(r=><tr key={r.label}><td>{r.label}</td>{r.values.map((v,i)=><td className="numeric" key={i}>{v.toLocaleString("es-EC")}</td>)}</tr>)}</tbody></table></div></details></section>;
}
export function Pie({ title, values }: {
    title: string;
    values: {
        label: string;
        value: number;
    }[];
}) {
    const total = values.reduce((n, v) => n + v.value, 0);
    let offset = 0;
    const gradient = values.map((v, i) => { const start = offset; offset += total ? v.value / total * 100 : 0; return colors[i % colors.length] + " " + start + "% " + offset + "%"; }).join(",");
    return <section className="panel chart-panel"><h3>{title}</h3><div className="pie-layout"><div className="pie" style={{ background: total ? "conic-gradient(" + gradient + ")" : "#e2e8f0" }} role="img" aria-label={values.map(v => v.label + " " + v.value).join(",")}><span>{total.toLocaleString("es-EC")}</span></div><ul>{values.map((v, i) => <li key={v.label}><i style={{ background: colors[i % colors.length] }}/>{v.label}<strong>{v.value.toLocaleString("es-EC")}</strong></li>)}</ul></div></section>;
}
export function Activity({ club }: {
    club: string;
}) {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
    const [start, setStart] = useState(today.slice(0, 7) + "-01"), [end, setEnd] = useState(today), [group, setGroup] = useState("day");
    const state = useData(start && end && start <= end ? `/api/clubs/${club}/dashboard/activity?` + new URLSearchParams({ start, end, group }) : null);
    const alerts = useData(`/api/clubs/${club}/dashboard/alerts`);
    const members = useData(`/api/clubs/${club}/members`);
    const facilities = useData(`/api/clubs/${club}/facilities`);
    const d = state.data, plans: Row[] = d?.plans || [], entries = Object.entries(d?.series || {}) as [
        string,
        Row
    ][];
    const memberRows: Row[] = members.data?.members || [];
    const active = memberRows.filter(m => m.status === "ACTIVE" && (m.role === "CLUB_ADMIN" || m.plans?.length));
    const reservations: Record<string, number> = {}, hours: Record<string, number> = {};
    entries.forEach(([, r]) => Object.entries(r.reservations).forEach(([k, v]) => { const [id, h] = k.split("/"); reservations[id] = (reservations[id] || 0) + Number(v); hours[h] = (hours[h] || 0) + Number(v); }));
    return <><header className="list-heading"><div><p className="eyebrow">Tu club en cifras</p><h2>Resumen y actividad</h2></div><div className="actions"><label>Desde<input type="date" value={start} max={end} onChange={e => setStart(e.target.value)}/></label><label>Hasta<input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)}/></label><label>Agrupar<select value={group} onChange={e => setGroup(e.target.value)}><option value="day">Días</option><option value="month">Meses</option></select></label></div></header>
 {start > end && <p role="alert">La fecha inicial debe ser anterior a la final.</p>}
 <Status state={state}><div className="metrics-grid"><dl className="metric-card"><dt>Miembros activos</dt><dd>{members.loading ? "—" : active.length}</dd></dl><dl className="metric-card"><dt>Nuevas suscripciones</dt><dd>{entries.reduce((s, [, r]) => s + Object.values(r.activations).reduce((n: number, v) => n + Number(v), 0), 0)}</dd></dl><dl className="metric-card"><dt>Ingresos confirmados</dt><dd>{money(entries.reduce((s, [, r]) => s + Object.values(r.incomeCents).reduce((n: number, v) => n + Number(v), 0), 0) / 100)}</dd></dl></div>

 <section className="panel"><h3>Alertas del club</h3><Status state={alerts}><div className="metrics-grid">{Object.entries(alerts.data?.summary || {}).map(([key, value]) => <dl className="metric-card" key={key}><dt>{({ expiringSubscriptions: "Próximos vencimientos", subscriptionsInGracePeriod: "En período de gracia", failedPayments: "Pagos fallidos", pendingApplications: "Solicitudes pendientes", upcomingReservations: "Próximas reservas" } as Record<string, string>)[key] || key}</dt><dd>{String(value)}</dd></dl>)}</div></Status></section>
 <div className="charts-grid"><Pie title="Miembros activos" values={[{ label: "Administradores", value: active.filter(m => m.role === "CLUB_ADMIN").length }, { label: "Miembros", value: active.filter(m => m.role === "MEMBER").length }]}/>
 <Pie title="Miembros activos por plan" values={plans.map(p=>({label:p.name,value:active.filter(m=>m.plans?.some((s:Row)=>s.plan.id===p.id)).length}))}/><Pie title="Ingresos por plan (USD)" values={plans.map(p => ({ label: p.name, value: entries.reduce((s, [, r]) => s + (r.incomeCents[p.id] || 0), 0) / 100 }))}/></div>
 <Bars title="Ingresos por período (USD)" yAxis="Ingresos (USD)" xAxis={group==="day"?"Días":"Meses"} calendar={group} rows={entries.map(([label, r]) => ({ label, values: plans.map(p => (r.incomeCents[p.id] || 0) / 100) }))} series={plans.map(p => p.name)}/>
 <div className="charts-grid"><Bars title="Reservas por hora" yAxis="Reservas" xAxis="Hora del día" series={["Reservas"]} rows={Object.entries(hours).sort().map(([label, value]) => ({ label: label + ":00", values: [value] }))}/><Bars title="Reservas por instalación" yAxis="Reservas" xAxis="Instalaciones" series={["Reservas"]} rows={Object.entries(reservations).map(([id, value]) => ({ label: facilities.data?.facilities.find((f: Row) => f.id === id)?.name || id.slice(0, 8), values: [value] }))}/></div>
 <Bars title="Reservas en el período" yAxis="Reservas" xAxis={group==="day"?"Días":"Meses"} calendar={group} series={["Reservas"]} rows={entries.map(([label, r]) => ({ label, values: [Object.values(r.reservations).reduce((n: number, v) => n + Number(v), 0)] }))}/>

 <Bars title="Miembros activos" yAxis="Miembros activos" xAxis={group==="day"?"Días":"Meses"} calendar={group} series={["Miembros activos al cierre"]} rows={entries.map(([label,r])=>({label,values:[r.activeMembers||0]}))}/><p className="muted">Estado de las membresías al cierre de cada día o mes. Los registros anteriores al historial de eventos se reconstruyen con las fechas disponibles.</p>
 <Bars title="Liquidaciones mensuales (USD)" yAxis="Neto (USD)" xAxis="Meses" calendar="month" series={["Pendientes", "En proceso", "Pagadas", "Canceladas"]} rows={(d?.settlements || []).map((r: Row) => ({ label: r.year + "-" + String(r.month).padStart(2, "0"), values: ["PENDING", "PROCESSING", "PAID", "CANCELLED"].map(s => r.status === s ? Number(r.netAmount) : 0) }))}/>
 </Status></>;
}
