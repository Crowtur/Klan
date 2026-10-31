"use client";
import { useState } from "react";
import Link from "next/link";
import {
  useData,
  Panel,
  Status,
  Action,
  Form,
  Pager,
  href,
  date,
  label,
  money,
  type Row,
} from "./common";
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
const hidden =
  /^(id|.*Id|success|period|referencePeriod|generatedAt|timeZone|feeModel|basis|pagination|filters|logoUrl|avatarUrl)$/;
function Facts({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) return <span>—</span>;
  if (typeof value !== "object")
    return (
      <span>
        {typeof value === "boolean" ? (value ? "Sí" : "No") : label(value)}
      </span>
    );
  if (Array.isArray(value))
    return value.length ? (
      <div>
        {value.map((v, i) => (
          <div key={i} className={depth < 2 ? "panel" : ""}>
            <Facts value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    ) : (
      <p>Sin registros.</p>
    );
  return (
    <dl>
      {Object.entries(value)
        .filter(([k]) => !hidden.test(k))
        .map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{names[k] || label(k).replace(/([a-z])([A-Z])/g, "$1 $2")}</dt>
            <dd>
              {/At$/.test(k) && typeof v === "string" ? (
                date(v)
              ) : (
                <Facts value={v} depth={depth + 1} />
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}
export function Dashboard({ club }: { club?: string }) {
  const [section, setSection] = useState("overview"),
    [period, setPeriod] = useState(
      new Date()
        .toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })
        .slice(0, 7),
    ),
    [v, setV] = useState(0);
  const [year, month] = period.split("-");
  const prefix = club ? `/api/clubs/${club}/dashboard` : "/api/admin/dashboard";
  const state = useData(
    `${prefix}/${section}?year=${year}&month=${Number(month)}`,
    v,
  );
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
  return (
    <>
      <h2>{club ? "Panel del club" : "Panel de la plataforma"}</h2>
      <div className="actions">
        <label>
          Sección
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            {options.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Período
          <input
            type="month"
            min="2000-01"
            max="2100-12"
            value={period}
            onChange={(e) => {
              if (e.target.value) setPeriod(e.target.value);
            }}
          />
        </label>
        <button onClick={() => setV(v + 1)}>Actualizar</button>
      </div>
      {section === "finances" && (
        <p>
          Importes en USD. Las comisiones son estimadas; las liquidaciones
          reflejan los registros del período.
        </p>
      )}
      <Status state={state}>
        {state.data &&
          allowed
            .filter((k) => state.data?.[k] !== undefined)
            .map((k) => (
              <Panel key={k} title={names[k] || k}>
                <Facts value={state.data?.[k]} />
              </Panel>
            ))}
        {!club && section === "finances" && (
          <Panel title="Liquidaciones del período">
            {state.data?.settlements?.records?.map((r: Row) => (
              <p key={r.id}>
                <Link href={href("settlement", { id: r.id })}>
                  {r.club?.name || r.clubName || "Liquidación"} ·{" "}
                  {money(r.netAmount)} · {label(r.status)}
                </Link>
              </p>
            ))}
          </Panel>
        )}
      </Status>
    </>
  );
}
export function GlobalClubs() {
  const [v, setV] = useState(0),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("");
  const state = useData(
    "/api/admin/dashboard/clubs?" +
      new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
        ...(status ? { status } : {}),
      }),
    v,
  );
  return (
    <>
      <h1>Clubes de la plataforma</h1>
      <div className="actions">
        <label>
          Buscar
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Estado
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {["ACTIVE", "INACTIVE", "SUSPENDED"].map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Status state={state}>
        {state.data?.clubs.map((c: Row) => (
          <Panel key={c.id} title={c.name}>
            <p>{label(c.status)}</p>
            <Facts value={c.statistics} />
            {c.status === "ACTIVE" ? (
              <Action
                url={`/api/clubs/${c.id}/suspend`}
                confirm={`¿Suspender ${c.name} y sus membresías?`}
                onDone={() => setV(v + 1)}
              >
                Suspender
              </Action>
            ) : (
              <Action
                url={`/api/clubs/${c.id}/reactivate`}
                confirm={`¿Reactivar ${c.name}? Esto no reactiva automáticamente todas las membresías.`}
                onDone={() => setV(v + 1)}
              >
                Reactivar
              </Action>
            )}
            <Link href={href("globalPosts", { club: c.id })}>
              Publicaciones
            </Link>
            <details>
              <summary>Generar liquidación</summary>
              <Form
                fields={[
                  {
                    name: "year",
                    label: "Año",
                    type: "number",
                    required: true,
                    min: 2000,
                    max: 2100,
                  },
                  {
                    name: "month",
                    label: "Mes",
                    type: "number",
                    required: true,
                    min: 1,
                    max: 12,
                  },
                ]}
                initial={{
                  year: new Date().getFullYear(),
                  month: new Date().getMonth() + 1,
                }}
                url="/api/admin/settlements"
                transform={(d) => ({ ...d, clubId: c.id })}
                onDone={() => setV(v + 1)}
                submit="Generar liquidación"
              />
            </details>
          </Panel>
        ))}
        <Pager data={state.data} page={page} onPage={setPage} />
      </Status>
    </>
  );
}
export function Settlement({ id }: { id: string }) {
  const [v, setV] = useState(0);
  const state = useData(`/api/admin/settlements/${id}`, v);
  return (
    <>
      <h1>Liquidación</h1>
      <Status state={state}>
        {state.data && (
          <>
            <Panel title={state.data.settlement.club?.name}>
              <Facts value={state.data.settlement} />
            </Panel>
            <p>Registrar el estado no realiza una transferencia bancaria.</p>
            <Form
              url={`/api/admin/settlements/${id}`}
              method="PATCH"
              initial={state.data.settlement}
              fields={[
                {
                  name: "status",
                  label: "Estado",
                  options: [
                    { value: "PENDING", label: "Pendiente" },
                    { value: "PROCESSING", label: "En proceso" },
                    { value: "PAID", label: "Pagada" },
                  ],
                },
                { name: "paymentReference", label: "Referencia del pago" },
                { name: "notes", label: "Notas", type: "textarea" },
              ]}
              onDone={() => setV(v + 1)}
            />
          </>
        )}
      </Status>
    </>
  );
}
