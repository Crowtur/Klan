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
import { useMobile } from "../use-mobile";
import { useId, useState, type CSSProperties } from "react";
import { useData, Status, money, type Row } from "./common";
const colors = ["#136336", "#34d399", "#66a182", "#ddb66a", "#8b7ab8", "#3c8eaf"];
const monthFormat = new Intl.DateTimeFormat("es-EC", {month:"long",year:"numeric",timeZone:"UTC"});
/** Convierte el mes de la serie al texto que se muestra en el eje temporal. */
function monthLabel(key:string) {
    return /^\d{4}-\d{2}$/.test(key) ? monthFormat.format(new Date(key + "-01T12:00:00Z")) : key;
}
type SeriesRow = {label:string; values:number[]};
const monthOnly = new Intl.DateTimeFormat("es-EC", {month:"long", timeZone:"UTC"});

/** La clave ISO de la API se interpreta en UTC para no retroceder un mes en Ecuador. */
function monthName(key:string) {
    return monthOnly.format(new Date(key + "-01T12:00:00Z"));
}

/** Formatos de lectura táctil: mantener centavos en ingresos y unidades enteras en conteos. */
const mobileDollars = new Intl.NumberFormat("es-EC", {style:"currency",currency:"USD",currencyDisplay:"code"});
const mobileCount = new Intl.NumberFormat("es-EC", {maximumFractionDigits:0});

/** Eje temporal móvil. Se conserva la escala de toda la serie al expandir, incluso
 * cuando el máximo cae después del sexto registro. El detalle tabular sigue disponible. */
function MobileTimeline({rows, series, calendar, max, grouped, metric, temporal, byYear, currency}: {
    rows:SeriesRow[]; series:string[]; calendar:string; max:number; grouped:boolean;
    metric:string; temporal:string; byYear:boolean; currency:boolean;
}) {
    // Cada cambio de rango monta un acordeón cerrado mediante la clave del componente padre.
    const [expanded, setExpanded] = useState(false);
    // Diferir las filas adicionales hasta la primera apertura; después pueden animarse también al cerrar.
    const [openedOnce,setOpenedOnce] = useState(false);
    const region = useId();
    const limit = 6;
    // Reservar la misma columna para todos los valores mantiene una escala comparable, también al expandir.
    const formatter = currency ? mobileDollars : mobileCount;
    const labelWidth = formatter.format(max).length + 1;
    /** Una barra por serie cuando se comparan altas; una barra apilada con el total cuando se suman ingresos. */
    function valueLine(values:number[], firstSeries:number) {
        const total = values.reduce((sum,value)=>sum+value,0);
        return <div className="timeline-value-line" key={firstSeries}>
            <div className="timeline-bars">{values.map((value,offset)=>{
                const index = firstSeries + offset;
                return <i key={index} style={{width:(100*value/max)+"%",background:colors[index%colors.length]}}
                    title={series[index]+": "+formatter.format(value)}/>;
            })}</div>
            <strong className="timeline-value">{grouped && <span className="sr-only">{series[firstSeries]}: </span>}{formatter.format(total)}</strong>
        </div>;
    }
    /** Para días se agrupa por mes y año; para meses se agrupa por año. */
    function period(key:string) {
        return calendar === "day" ? monthLabel(key.slice(0,7)) : "Año " + key.slice(0,4);
    }
    /** Conserva el índice de la serie completa al dividirla en dos tramos, para no duplicar cabeceras. */
    function bar(row:SeriesRow, index:number) {
        const heading = index === 0 || period(row.label) !== period(rows[index-1].label);
        return <div key={row.label}>
            {heading && <div className="timeline-period">{period(row.label)}</div>}
            <div className="timeline-row"><span>{calendar === "day" ? row.label.slice(8) : monthName(row.label)}</span>
                {/* Conservar la cifra visible incluso si la barra de valor cero no tiene longitud. */}
                <div className="timeline-values">{grouped
                    ? row.values.map((value,i)=>valueLine([value],i))
                    : valueLine(row.values,0)}
                </div>
            </div>
        </div>;
    }
    return <div className="mobile-timeline" style={{"--timeline-value-width":labelWidth+"ch"} as CSSProperties}>
        {!byYear && <strong className="chart-axis">{temporal}</strong>}
        {rows.slice(0,limit).map(bar)}
        {/* El tramo adicional permanece plegado y fuera del árbol accesible hasta pedir más datos. */}
        {rows.length > limit && <div id={region} className="timeline-extra" data-expanded={expanded} inert={!expanded}>
            <div>{openedOnce && rows.slice(limit).map((row,i) => bar(row,i+limit))}</div>
        </div>}
        <strong className="chart-axis horizontal">{metric}</strong>
        {rows.length > limit && <button type="button" className="timeline-toggle" aria-controls={region}
            aria-expanded={expanded} onClick={() => {
                setOpenedOnce(true);
                setExpanded(value=>!value);
            }}>
            {expanded ? "Mostrar menos ▲" : "Ver todos los datos ("+(rows.length-limit)+" más) ▼"}
        </button>}
    </div>;
}

/** Representa los valores de una serie mediante barras con una escala común. */
export function Bars({title, rows, series, grouped=false, xAxis, yAxis, calendar, mobileTimeline=false, byYear=false, currency=false}: {
    title:string; rows:{label:string;values:number[]}[]; series:string[]; grouped?:boolean;
    xAxis:string; yAxis:string; calendar?:string; mobileTimeline?:boolean; byYear?:boolean; currency?:boolean;
}) {
    // Solo las cinco gráficas temporales solicitadas cambian de orientación en móvil.
    const mobile = useMobile();
    const max = Math.max(1, ...rows.map(r => grouped ? Math.max(0,...r.values) : r.values.reduce((a,b)=>a+b,0)));
    const months:{key:string;count:number}[] = [];
    if (calendar === "day" || byYear) for (const row of rows) {
        const key = row.label.slice(0,byYear ? 4 : 7), last = months.at(-1);
        if (last?.key === key) last.count++;
        else months.push({key,count:1});
    }
    // Escritorio conserva una columna por dato. Bajo 768 px el CSS agrupa las columnas en varias filas.
    const tracks = {gridTemplateColumns: `repeat(${rows.length},minmax(0,1fr))`};
    return <section className="panel chart-panel"><h3>{title}{!byYear && months.length === 1 && " · " + monthLabel(months[0].key)}</h3>
      {!rows.length ? <p>Sin movimientos en este período.</p> : mobile && mobileTimeline && calendar ?
        <MobileTimeline key={calendar+rows[0].label+rows[rows.length-1].label} rows={rows} series={series}
            calendar={calendar} max={max} grouped={grouped} metric={yAxis} temporal={xAxis} byYear={byYear} currency={currency}/> : <>
        <strong className="chart-axis">{yAxis}</strong>
        <div className="chart-scroll"><div style={{minWidth:rows.length * 52}}>
          <div className="chart-bars" style={tracks}>{rows.map(r=><div className="chart-column" key={r.label} data-period={calendar==="month" ? (byYear ? monthName(r.label) : monthLabel(r.label)) : r.label}>
            {/* Móvil: la longitud reutiliza la misma escala que la altura original, también en series agrupadas. */}
            <div className={grouped?"bar-stack grouped":"bar-stack"}>{r.values.map((v,i)=><div key={i} style={{height:220*v/max,background:colors[i%colors.length],"--mobile-bar-width":(100*v/max)+"%"} as CSSProperties} title={series[i]+": "+v}/>)}</div>
            <small>{calendar==="day" ? Number(r.label.slice(8)) : calendar==="month" ? (byYear ? monthName(r.label) : monthLabel(r.label)) : r.label}</small>
          </div>)}</div>
          {(months.length>1 || byYear) && <div className="chart-months" style={tracks}>{months.map(m=><span key={m.key} style={{gridColumn:"span "+m.count}}>{byYear ? "Año "+m.key : monthLabel(m.key)}</span>)}</div>}
        </div></div>{!byYear && <strong className="chart-axis horizontal">{xAxis}</strong>}</>}
      <div className="chart-legend">{series.map((s,i)=><span key={s}><i style={{background:colors[i%colors.length]}}/>{s}</span>)}</div>
      <details><summary>Ver valores</summary><div className="table-scroll"><table><thead><tr><th>{xAxis}</th>{series.map(s=><th className="numeric" key={s}>{s}</th>)}</tr></thead>
        {/* Móvil: cada celda lleva el nombre real de su serie, incluso al cambiar de período. */}
        <tbody>{rows.map(r=><tr key={r.label}><td data-label={xAxis}>{r.label}</td>{r.values.map((v,i)=><td data-label={series[i]} className="numeric" key={i}>{v.toLocaleString("es-EC")}</td>)}</tr>)}</tbody></table></div></details></section>;
}
/** Distribuye las porciones según su participación en el total y conserva las etiquetas en la leyenda. */
export function Pie({ title, values }: {
    title: string;
    values: {
        label: string;
        value: number;
    }[];
}) {
    const total = values.reduce((n, v) => n + v.value, 0);
    let offset = 0;
    const gradient = values.map((v, i) => { const start = offset; offset += total ? v.value / total * 100 : 0; return (values.length<=colors.length?colors[i]:`hsl(${Math.round(i*137.508)%360} 45% 48%)`) + " " + start + "% " + offset + "%"; }).join(",");
    return <section className="panel chart-panel"><h3>{title}</h3><div className="pie-layout"><div className="pie" style={{ background: total ? "conic-gradient(" + gradient + ")" : "#e2e8f0" }} role="img" aria-label={values.map(v => v.label + " " + v.value).join(",")}><span>{total.toLocaleString("es-EC")}</span></div><ul>{values.map((v, i) => <li key={i}><i style={{ background: values.length<=colors.length?colors[i]:`hsl(${Math.round(i*137.508)%360} 45% 48%)` }}/>{v.label}<strong>{v.value.toLocaleString("es-EC")}</strong></li>)}</ul></div></section>;
}
/** Solicita la actividad para el intervalo elegido y adapta las series a los gráficos. */
export function Activity({ club }: {
    club: string;
}) {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
    const [start, setStart] = useState(today.slice(0, 7) + "-01"), [end, setEnd] = useState(today), [group, setGroup] = useState("day");
    // En móvil el selector de mes consulta todo el período. El rango personalizado del escritorio se conserva al girar.
    const mobile = useMobile();
    const [period,setPeriod] = useState(today.slice(0,7));
    const [section,setSection] = useState("all");
    // La opción personalizada conserva las consultas de varios meses que admite la API.
    const [customRange,setCustomRange] = useState(false);
    const monthly = mobile && !customRange;
    const [year,month] = period.split("-").map(Number);
    const queryStart = monthly ? period+"-01" : start;
    const queryEnd = monthly ? new Date(Date.UTC(year,month,0)).toISOString().slice(0,10) : end;
    const aggregation = monthly ? "day" : group;
    // El filtro de sección oculta únicamente las vistas móviles ajenas a la categoría escogida.
    const visible = (category:string) => !mobile || section==="all" || section===category;
    const state = useData(queryStart && queryEnd && queryStart <= queryEnd ? `/api/clubs/${club}/dashboard/activity?` + new URLSearchParams({ start:queryStart, end:queryEnd, group:aggregation }) : null);
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
    return <>{mobile ? <header className="overview-mobile">
        <h2>Resumen del club</h2><p>Tu comunidad y tus ingresos, de un vistazo.</p>
        {/* El resumen consulta registros reales del club para la sección y el período seleccionados. */}
        {/* Las tres listas controlan el conjunto de gráficas y el intervalo real enviado al servidor. */}
        <div><label>Sección<select value={section} onChange={e=>setSection(e.target.value)}>
            <option value="all">Todas las secciones</option><option value="members">Miembros</option>
            <option value="finance">Ingresos</option><option value="reservations">Reservas</option>
        </select></label>
        <label>Período · Año<select disabled={customRange} value={year} onChange={e=>setPeriod(e.target.value+period.slice(4))}>
            {Array.from({length:Math.max(1,Number(today.slice(0,4))-2000+1)},(_,i)=>Number(today.slice(0,4))-i).map(y=><option key={y}>{y}</option>)}
        </select></label>
        <label>Mes<select value={customRange ? "custom" : month} onChange={e=>{
            // Una selección mensual usa límites de calendario; un rango libre utiliza las fechas siguientes.
            const custom = e.target.value === "custom";
            setCustomRange(custom);
            if (!custom) setPeriod(year+"-"+e.target.value.padStart(2,"0"));
        }}>
            {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{monthName(year+"-"+String(m).padStart(2,"0"))}</option>)}
            <option value="custom">Personalizado</option>
        </select></label>
        {customRange && <><label>Desde<input type="date" value={start} max={end} onChange={e=>setStart(e.target.value)}/></label>
            <label>Hasta<input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label>
            <label>Agrupar<select value={group} onChange={e=>setGroup(e.target.value)}>
                <option value="day">Días</option><option value="month">Meses</option>
            </select></label></>}
        </div></header> : <header className="list-heading"><div><p className="eyebrow">Tu club en cifras</p><h2>Resumen y actividad</h2></div><div className="actions"><label>Desde<input type="date" value={start} max={end} onChange={e => setStart(e.target.value)}/></label><label>Hasta<input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)}/></label><label>Agrupar<select value={group} onChange={e => setGroup(e.target.value)}><option value="day">Días</option><option value="month">Meses</option></select></label></div></header>}
 {!monthly && start > end && <p role="alert">La fecha inicial debe ser anterior a la final.</p>}
 <Status state={state}>{visible("all") && <><div className="metrics-grid"><dl className="metric-card"><dt>Miembros activos</dt><dd>{members.loading ? "—" : active.length}</dd></dl><dl className="metric-card"><dt>Nuevas suscripciones</dt><dd>{entries.reduce((s, [, r]) => s + Object.values(r.activations).reduce((n: number, v) => n + Number(v), 0), 0)}</dd></dl><dl className="metric-card"><dt>Ingresos confirmados</dt><dd>{money(entries.reduce((s, [, r]) => s + Object.values(r.incomeCents).reduce((n: number, v) => n + Number(v), 0), 0) / 100)}</dd></dl></div>

 <section className="panel"><h3>Alertas del club</h3><Status state={alerts}><div className="metrics-grid">{Object.entries(alerts.data?.summary || {}).map(([key, value]) => <dl className="metric-card" key={key}><dt>{({ expiringSubscriptions: "Próximos vencimientos", subscriptionsInGracePeriod: "En período de gracia", failedPayments: "Pagos fallidos", pendingApplications: "Solicitudes pendientes", upcomingReservations: "Próximas reservas" } as Record<string, string>)[key] || key}</dt><dd>{String(value)}</dd></dl>)}</div></Status></section></>}
 <div className="charts-grid">{visible("members") && <Pie title="Miembros activos" values={[{ label: "Administradores", value: active.filter(m => m.role === "CLUB_ADMIN").length }, { label: "Miembros", value: active.filter(m => m.role === "MEMBER").length }]}/>}
 {visible("members") && <Pie title="Miembros activos por plan" values={plans.map(p=>({label:p.name,value:active.filter(m=>m.plans?.some((s:Row)=>s.plan.id===p.id)).length}))}/>} {visible("finance") && <Pie title="Ingresos por plan (USD)" values={plans.map(p => ({ label: p.name, value: entries.reduce((s, [, r]) => s + (r.incomeCents[p.id] || 0), 0) / 100 }))}/>}</div>
 {visible("finance") && <><Bars mobileTimeline currency title="Ingresos por período (USD)" yAxis="Ingresos (USD)" xAxis={aggregation==="day"?"Días":"Meses"} calendar={aggregation} rows={entries.map(([label, r]) => ({ label, values: plans.map(p => (r.incomeCents[p.id] || 0) / 100) }))} series={plans.map(p => p.name)}/></>}
 {visible("reservations") && <div className="charts-grid"><Bars title="Reservas por hora" yAxis="Reservas" xAxis="Hora del día" series={["Reservas"]} rows={Object.entries(hours).sort().map(([label, value]) => ({ label: label + ":00", values: [value] }))}/><Bars title="Reservas por instalación" yAxis="Reservas" xAxis="Instalaciones" series={["Reservas"]} rows={Object.entries(reservations).map(([id, value]) => ({ label: facilities.data?.facilities.find((f: Row) => f.id === id)?.name || id.slice(0, 8), values: [value] }))}/></div>}
 {visible("reservations") && <><Bars mobileTimeline title="Reservas en el período" yAxis="Reservas" xAxis={aggregation==="day"?"Días":"Meses"} calendar={aggregation} series={["Reservas"]} rows={entries.map(([label, r]) => ({ label, values: [Object.entries(r.reservations).reduce((sum,[key,value]) => {
     // Móvil: la clave del backend termina en el estado; excluir las reservas canceladas del conteo confirmado.
     return sum + ((!mobile || key.endsWith("/CONFIRMED")) ? Number(value) : 0);
 }, 0)] }))}/></>}

 {visible("members") && <><Bars mobileTimeline title="Miembros activos" yAxis="Miembros activos" xAxis={aggregation==="day"?"Días":"Meses"} calendar={aggregation} series={["Miembros activos al cierre"]} rows={entries.map(([label,r])=>({label,values:[r.activeMembers||0]}))}/><p className="muted">Estado de las membresías al cierre de cada día o mes. Los registros anteriores al historial de eventos se reconstruyen con las fechas disponibles.</p></>}
 {visible("finance") && <><Bars title="Liquidaciones mensuales (USD)" yAxis="Neto (USD)" xAxis="Meses" calendar="month" series={["Pendientes", "En proceso", "Pagadas", "Canceladas"]} rows={(d?.settlements || []).map((r: Row) => ({ label: r.year + "-" + String(r.month).padStart(2, "0"), values: ["PENDING", "PROCESSING", "PAID", "CANCELLED"].map(s => r.status === s ? Number(r.netAmount) : 0) }))}/></>}
 </Status></>;
}
