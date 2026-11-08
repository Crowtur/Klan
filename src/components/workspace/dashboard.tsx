"use client";
import {AvatarImage} from "@/components/avatar-image";
import {ActionDropdown} from "./action-dropdown";
import {BankDetails,FinanceChart,SettlementForm} from "./finance-controls";
import {Bars,Pie} from "./activity";
import {UploadDropzone} from "@/lib/uploadthing";
import { GlobalFinances } from "./global-finances";
import { PageHeading, Icon } from "@/components/ui";
import { useState } from "react";
import Link from "next/link";
import { Badge, useData, Panel, Status, Action, Form, Pager, href, date, label, money, safeUrl, type Row, } from "./common";
const names: Record<string, string> = {
    summary: "Resumen",
    total: "Total",
    active: "Activos",
    inactive: "Inactivos",
    suspended: "Suspendidos",
    members: "Miembros",
    subscriptions: "Suscripciones",
    reservations: "Reservas",
    finances: "Finanzas",
    confirmed: "Confirmadas",
    cancelled: "Canceladas",
    paidPayments: "Pagos realizados",
    grossRevenue: "Ingresos brutos",
    totalMembers: "Total de miembros",
    activeMembers: "Miembros activos",
    suspendedMembers: "Membresías suspendidas",
    removedMembers: "Membresías retiradas",
    roles: "Roles",
    activeAdmins: "Administradores",
    activeRegularMembers: "Miembros",
    membersWithSubscription: "Con suscripción",
    membersWithoutSubscription: "Sin suscripción",
    membersByPlan: "Miembros por plan",
    monthlyGrowth: "Evolución mensual",
    year: "Año",
    month: "Mes",
    name: "Nombre",
    planName: "Plan",
    count: "Cantidad",
    totalSubscriptions: "Total de suscripciones",
    totalPlans:"Planes totales",activePlans:"Planes activos",
    currentlyActive: "Vigentes",
    byStatus: "Por estado",
    expirations: "Vencimientos",
    next7Days: "Próximos 7 días",
    next30Days: "Próximos 30 días",
    inGracePeriod: "En período de gracia",
    subscriptionsByPlan: "Suscripciones por plan",
    upcomingExpirations: "Próximos vencimientos",
    monthlyCreations: "Altas mensuales",
    totalFacilities: "Instalaciones",
    activeFacilities: "Instalaciones activas",
    inactiveFacilities: "Instalaciones inactivas",
    confirmedReservations: "Reservas confirmadas",
    cancelledReservations: "Reservas canceladas",
    totalReservations: "Total de reservas",
    reservedMinutes: "Minutos reservados",
    reservedHours: "Horas reservadas",
    openingMinutes: "Minutos de apertura",
    openingHours: "Horas de apertura",
    occupancyRate: "Ocupación (%)",
    facilities: "Instalaciones",
    mostUsedFacilities: "Instalaciones más usadas",
    reservationsByHour: "Reservas por hora",
    monthlyReservations: "Reservas mensuales",
    fees: "Comisiones estimadas",
    estimatedFees: "Comisiones estimadas",
    stripe: "Procesamiento",
    transfer: "Transferencia",
    platform: "Plataforma",
    estimatedClubNet: "Neto estimado del club",
    revenueByPlan: "Ingresos por plan",
    monthlyRevenue: "Ingresos mensuales",
    paymentStatuses: "Estados de pago",
    counts: "Cantidades",
    settlements: "Liquidaciones",
    records: "Registros",
    grossAmount: "Importe bruto",
    netAmount: "Importe neto",
    stripeFee: "Comisión de procesamiento",
    transferFee: "Comisión de transferencia",
    platformFee: "Comisión de plataforma",
    totalFees: "Comisiones totales",
    status: "Estado",
    paidAt: "Fecha de pago",
    paymentReference: "Referencia de pago",
    notes: "Notas",
    expiringSubscriptions: "Suscripciones por vencer",
    subscriptionsInGracePeriod: "Suscripciones en gracia",
    failedPayments: "Pagos fallidos",
    pendingApplications: "Solicitudes pendientes",
    upcomingReservations: "Próximas reservas",
    alerts: "Alertas",
    recentActivity: "Actividad reciente",
    title: "Título",
    message: "Mensaje",
    type: "Tipo",
    items: "Elementos",
    user: "Usuario",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo",
    club: "Club",
    plan: "Plan",
    facility: "Instalación",
    createdAt: "Fecha de creación",
    expiresAt: "Vence",
    startAt: "Inicio",
    endAt: "Fin",
    amount: "Importe",
    currency: "Moneda",
    clubs: "Clubes",
    users: "Usuarios",
    memberships: "Membresías",
    newInPeriod: "Nuevos del período",
    financesByClub: "Finanzas por club",
    recordedGross: "Bruto registrado",
    recordedPlatformFees: "Comisiones registradas",
    recordedNet: "Neto registrado",
    transferredNet: "Neto transferido",
    pendingTransferNet: "Neto pendiente",
    reconciliation: "Conciliación",
    estimatedGross: "Bruto estimado",
    recordedSettlementGross: "Bruto de liquidaciones",
    grossDifference: "Diferencia bruta",
    estimatedPlatformFees: "Comisiones estimadas",
    platformFeeDifference: "Diferencia de comisiones",
    hour: "Hora",
    totalClubs: "Total de clubes",
    clubsWithActivity: "Clubes con actividad",
    clubsWithoutActivity: "Clubes sin actividad",
    totals: "Totales",
    statistics: "Estadísticas",
    newMembers: "Nuevos miembros",
    newSubscriptions: "Nuevas suscripciones",
    newUsers: "Nuevos usuarios",
    newClubs: "Nuevos clubes",
    totalPayments: "Total de pagos",
    totalAmount: "Importe total",
    totalMinutes: "Minutos totales",
    usedMinutes: "Minutos usados",
    date: "Fecha",
    description: "Descripción",
    subscription: "Suscripción",
    reservation: "Reserva",
    payment: "Pago",
};
const hidden = /^(id|.*Id|success|period|referencePeriod|generatedAt|timeZone|feeModel|basis|pagination|filters|logoUrl|avatarUrl)$/;
const monetary = /amount|revenue|net|fee|gross|transferred|transfernet|difference|^(stripe|transfer|platform)$/i;
function scalar(value: unknown, key: string) {
    if (value === null || value === undefined)
        return "—";
    if (key === "currency")
        return "USD";
    if (/At$/.test(key) && typeof value === "string")
        return date(value);
    if (monetary.test(key) && (typeof value === "number" || typeof value === "string") && Number.isFinite(Number(value)))
        return money(value);
    if (typeof value === "boolean")
        return value ? "Sí" : "No";
    return label(value);
}
function Facts({ value, depth = 0 }: {
    value: unknown;
    depth?: number;
}) {
    if (value === null || value === undefined)
        return <span>—</span>;
    if (typeof value !== "object")
        return <span>{scalar(value, "")}</span>;
    if (Array.isArray(value))
        return value.length ? <div className="fact-list">{value.map((v, i) => <div key={i} className="fact-record"><Facts value={v} depth={depth + 1}/></div>)}</div> : <p className="muted">Sin registros en este período.</p>;
    const entries = Object.entries(value).filter(([k]) => !hidden.test(k));
    const simple = entries.filter(([, v]) => v === null || typeof v !== "object");
    const nested = entries.filter(([, v]) => v !== null && typeof v === "object");
    return <><div className="facts-grid">{simple.map(([k, v]) => <dl className="fact" key={k}><dt>{names[k] || label(k).replace(/([a-z])([A-Z])/g, "$1 $2")}</dt><dd className={typeof v==="number" || typeof v==="string" && monetary.test(k) ? "numeric":undefined}>{k === "status" ? <Badge value={v}/> : scalar(v, k)}</dd></dl>)}</div>{nested.map(([k, v]) => <section className="facts-section" key={k}><h3>{names[k] || label(k)}</h3><Facts value={v} depth={depth + 1}/></section>)}</>;
}
export function Dashboard({ club }: {
    club?: string;
}) {
    const [section, setSection] = useState("overview"), [period, setPeriod] = useState(new Date()
        .toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })
        .slice(0, 7)), [v, setV] = useState(0);
    const [year, month] = period.split("-");
    const prefix = club ? `/api/clubs/${club}/dashboard` : "/api/admin/dashboard";
    const state = useData(`${prefix}/${section}?year=${year}&month=${Number(month)}`, v);
    const options = club
        ? [
            ["overview", "Resumen"],
            ["members", "Miembros"],
            ["subscriptions", "Suscripciones"],
            ["reservations", "Reservas"],
            ["finances", "Finanzas"],
            ["alerts", "Alertas"],
        ]
        : [
            ["overview", "Resumen"],
            ["finances", "Finanzas y liquidaciones"],
        ];
    const allowed = club
        ? [
            "members",
            "subscriptions",
            "reservations",
            "finances",
            "summary",
            "roles",
            "membersByPlan",
            "monthlyGrowth",
            "expirations",
            "subscriptionsByPlan",
            "upcomingExpirations",
            "monthlyCreations",
            "facilities",
            "mostUsedFacilities",
            "reservationsByHour",
            "monthlyReservations",
            "paymentStatuses",
            "revenueByPlan",
            "monthlyRevenue",
            "settlements",
            "alerts",
            "recentActivity",
        ]
        : [
            "clubs",
            "users",
            "memberships",
            "subscriptions",
            "reservations",
            "finances",
            "monthlyGrowth",
            "summary",
            "financesByClub",
            "monthlyRevenue",
            "reconciliation",
        ];
    return (<>
      <PageHeading level={club ? 2 : 1} eyebrow={club ? "Tu club, de un vistazo" : "Administración global"} title={club ? "Resumen y actividad" : "El pulso de Klubo"} description="Consulta las métricas y el movimiento de tu comunidad."/>
      <div className="dashboard-controls">
        <label>
          Sección
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            {options.map(([v, l]) => (<option key={v} value={v}>
                {l}
              </option>))}
          </select>
        </label>
        <label>
          Período
          <input type="month" min="2000-01" max="2100-12" value={period} onChange={(e) => {
            if (e.target.value)
                setPeriod(e.target.value);
        }}/>
        </label>

      </div>
      {!club && section === "finances" && <GlobalFinances year={year} month={month} version={v} onDone={() => setV(v + 1)}/>}
      {club && section === "finances" && (<p>
          Importes en USD. Las comisiones son estimadas; las liquidaciones
          reflejan los registros del período.
        </p>)}
      {(club || section !== "finances") && <Status state={state}>
        {!club && section==="overview" && state.data ? <GlobalOverview data={state.data} year={year} month={month}/> : <div className="dashboard-grid">{state.data &&
                allowed
                    .filter((k) => state.data?.[k] !== undefined)
                    .map((k) => (<Panel key={k} title={names[k] || k}>
                <Facts value={state.data?.[k]}/>
              </Panel>))}
        </div>}{!club && section === "finances" && (<Panel title="Liquidaciones del período">
            {state.data?.settlements?.records?.map((r: Row) => (<p key={r.id}>
                <Link href={href("settlement", { id: r.id })}>
                  {r.club?.name || r.clubName || "Liquidación"} ·{" "}
                  {money(r.netAmount)} · {label(r.status)}
                </Link>
              </p>))}
          </Panel>)}
      </Status>}
    </>);
}
export function GlobalClubs() {
    const [v, setV] = useState(0), [page, setPage] = useState(1), [search, setSearch] = useState(""), [status, setStatus] = useState("");
    const [order,setOrder]=useState("oldest");
    const state = useData("/api/admin/dashboard/clubs?" +
        new URLSearchParams({
            page: String(page),
            limit: "10",order,scope:"lifetime",
            search,
            ...(status ? { status } : {}),
        }), v);
    const platform=useData(search||status?"/api/admin/dashboard/clubs?scope=lifetime&limit=1":null,v);
    const summary=(search||status?platform.data:state.data)?.summary;
    return (<>
      <PageHeading eyebrow="Administración global" title="Clubes de la plataforma" description="Supervisa y administra las comunidades de la plataforma."/>
      <div className="metrics-grid">{[
        ["Clubes registrados",summary?.totalClubs,summary && summary.byStatus.ACTIVE+" activos · "+summary.byStatus.SUSPENDED+" suspendidos"],
        ["Miembros totales",summary?.totals.members,summary && summary.totals.activeMembers+" miembros activos"],
        ["Ingresos brutos",summary && money(summary.totals.grossRevenue),"Acumulado de la plataforma"]
      ].map(([k,n,detail])=><dl className="metric-card" key={k}><dt>{k}</dt><dd>{n??"—"}</dd><small>{detail}</small></dl>)}</div>
      <div className="club-filter"><label><Icon name="search"/><input aria-label="Buscar club" placeholder="Buscar club por nombre..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></label>
      <select aria-label="Estado de los clubes" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="">Todos</option><option value="ACTIVE">Activos</option><option value="SUSPENDED">Suspendidos</option><option value="INACTIVE">Inactivos</option></select></div>
      <div className="list-heading"><small>{state.data?.pagination.totalItems??"—"} clubes</small><label>Ordenar<select value={order} onChange={e=>{setOrder(e.target.value);setPage(1)}}><option value="oldest">Más antiguos primero</option><option value="newest">Más recientes primero</option></select></label></div>
      <Status state={state}>{state.data?.clubs.length===0&&<p>No se encontraron clubes.</p>}
      {state.data?.clubs.map((c:Row)=>{const m=c.statistics;return <article className="panel global-club" key={c.id}><header><span className="avatar">{safeUrl(c.logoUrl)?<AvatarImage src={safeUrl(c.logoUrl)} alt=""/>:c.name.slice(0,2).toUpperCase()}</span><div><h2>{c.name}</h2><small>{c.address&&c.address+" · "}Desde {new Date(c.createdAt).toLocaleDateString("es-EC",{month:"short",year:"numeric"})}</small></div><Badge value={c.status}/></header>
      <div className="club-kpis">{[
        ["Miembros",m.totalMembers+" totales",m.activeMembers+" activos"],
        ["Planes y suscripciones",m.activePlans+" planes activos",m.totalPlans+" planes totales · "+m.activeSubscriptions+" suscripciones activas · "+m.totalFacilities+" instalaciones"],
        ["Reservas y pagos",m.confirmedReservations+" confirmadas",m.cancelledReservations+" canceladas · "+m.paidPayments+" pagos realizados"],
        ["Finanzas",money(m.grossRevenue),"Ingresos brutos acumulados"]].map(([k,n,v])=><div key={k}><small>{k}</small><strong>{n}</strong><small>{v}</small></div>)}</div>
      <footer><small>{c.status==="SUSPENDED"?"Acceso al club suspendido":"Los cambios de estado requieren confirmación"}</small><Action url={`/api/clubs/${c.id}/${c.status==="ACTIVE"?"suspend":"reactivate"}`} confirm={c.status==="ACTIVE"?"¿Suspender el club y sus membresías?":"¿Reactivar el club?"} onDone={()=>setV(v=>v+1)}>{c.status==="ACTIVE"?"Suspender":"Reactivar"}</Action>
      <ActionDropdown label="Visitar club">{close=><><Link onClick={close} href={href("club",{club:c.id})}>Como admin</Link><Link onClick={close} href={href("publicClub",{club:c.id})}>Como visitante</Link></>}</ActionDropdown></footer></article>})}
        <Pager data={state.data} page={page} onPage={setPage}/>
      </Status>
    </>);
}
export function Settlement({ id }: {
    id: string;
}) {
    const [v, setV] = useState(0);
    const [uploadError,setUploadError]=useState("");
    const state = useData(`/api/admin/settlements/${id}`, v);
    return (<>
      <PageHeading eyebrow="Administración global" title="Detalle de liquidación" description="Importes y seguimiento de transferencias del club en USD." action={<Link className="btn btn-outline" href={href("admin")}>Volver al panel <Icon name="arrow" size={16}/></Link>}/>
      <Status state={state}>
        {state.data && (<>
            <Panel title={state.data.settlement.club?.name}>
              <div className="metrics-grid">{[["Bruto", state.data.settlement.grossAmount], ["Comisiones", state.data.settlement.totalFees], ["Neto a abonar", state.data.settlement.netAmount]].map(([k, v]) => <dl className="metric-card" key={k}><dt>{k}</dt><dd>{money(v)}</dd></dl>)}</div><p><Badge value={state.data.settlement.status}/> · {state.data.settlement.month}/{state.data.settlement.year}</p><p>Referencia: {state.data.settlement.paymentReference || "Pendiente de registrar"}</p><p>{state.data.settlement.notes}</p>
            </Panel>
            <BankDetails data={state.data.settlement.club.bankDetails}/><Panel title="Comprobante de pago">{safeUrl(state.data.settlement.receiptUrl)&&<a className="btn btn-outline" target="_blank" rel="noreferrer" href={safeUrl(state.data.settlement.receiptUrl)}>Ver comprobante: {state.data.settlement.receiptFileName}</a>}<UploadDropzone endpoint="settlementReceiptUploader" input={{settlementId:id}} config={{mode:"auto"}} content={{label:"Arrastra el comprobante o haz clic para elegir",allowedContent:"Un PDF o imagen · Máximo 8 MB",button:"Subir comprobante"}} onClientUploadComplete={()=>setV(v=>v+1)} onUploadError={e=>setUploadError(e.message)}/>{uploadError&&<p role="alert">{uploadError}</p>}</Panel>
            <p>Registrar el estado no realiza una transferencia bancaria.</p>
            <SettlementForm settlement={state.data.settlement} onDone={()=>setV(v=>v+1)}/>
          </>)}
      </Status>
    </>);
}

function GlobalOverview({data:d,year,month}:{data:Row;year:string;month:string}){
 const finance=useData(`/api/admin/dashboard/finances?year=${year}&month=${Number(month)}`);
 const statusValues=(v:Row)=>Object.entries(v).map(([key,value])=>({label:names[key]||label(key),value:Number(value)}));
 return <><div className="charts-grid"><Pie title="Clubes" values={statusValues({active:d.clubs.active,inactive:d.clubs.inactive,suspended:d.clubs.suspended})}/><Pie title="Usuarios" values={statusValues({active:d.users.active,inactive:d.users.inactive,suspended:d.users.suspended})}/><Pie title="Membresías" values={[{label:"Activas",value:d.memberships.active},{label:"No activas",value:Math.max(0,d.memberships.total-d.memberships.active)}]}/><Pie title="Suscripciones" values={statusValues(d.subscriptions.byStatus)}/><Pie title="Reservas" values={statusValues({confirmed:d.reservations.confirmed,cancelled:d.reservations.cancelled})}/><Status state={finance}><FinanceChart clubs={finance.data?.financesByClub||[]}/></Status></div><Bars grouped title="Evolución mensual" yAxis="Altas" xAxis="Meses" calendar="month" series={["Nuevos clubes","Nuevos usuarios"]} rows={d.monthlyGrowth.map((r:Row)=>({label:r.year+"-"+String(r.month).padStart(2,"0"),values:[r.newClubs,r.newUsers]}))}/></>;
}
