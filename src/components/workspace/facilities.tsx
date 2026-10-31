"use client";
import { useState } from "react";
import Link from "next/link";
import {
  api,
  useData,
  Status,
  Panel,
  Form,
  Action,
  Empty,
  href,
  date,
  label,
  facilityFields,
  type Row,
} from "./common";
const days = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
const dayNames = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
export function Facilities({ club, admin }: { club: string; admin: boolean }) {
  const [v, setV] = useState(0);
  const base = `/api/clubs/${club}/facilities`;
  const state = useData(base, v);
  return (
    <>
      <h2>Instalaciones</h2>
      {admin && (
        <details>
          <summary>Crear instalación</summary>
          <Form fields={facilityFields} url={base} onDone={() => setV(v + 1)} />
        </details>
      )}
      <Status state={state}>
        <Empty rows={state.data?.facilities || []} />
        {state.data?.facilities.map((f: Row) => (
          <Panel key={f.id} title={f.name}>
            <p>{f.description}</p>
            <p>
              {f.location} · Capacidad: {f.capacity || "—"} · {label(f.status)}
            </p>
            <Link href={href("facility", { club, id: f.id })}>
              Consultar y reservar
            </Link>
          </Panel>
        ))}
      </Status>
    </>
  );
}
export function Reservations({
  club,
  facility,
  admin = false,
}: {
  club: string;
  facility?: string;
  admin?: boolean;
}) {
  const [v, setV] = useState(0);
  const base = `/api/clubs/${club}`;
  const state = useData(
    facility
      ? `${base}/facilities/${facility}/reservations`
      : `${base}/my-reservations`,
    v,
  );
  return (
    <>
      <h2>{admin ? "Reservas de la instalación" : "Mis reservas"}</h2>
      <Status state={state}>
        <Empty rows={state.data?.reservations || []} />
        {state.data?.reservations.map((r: Row) => (
          <Panel key={r.id} title={r.facility?.name || "Reserva"}>
            <p>
              {date(r.startAt)} — {date(r.endAt)} (Ecuador)
            </p>
            <p>{label(r.status)}</p>
            {r.status === "CONFIRMED" && (
              <Action
                method="PATCH"
                url={`${base}/facilities/${r.facilityId || facility}/reservations/${r.id}`}
                confirm="¿Cancelar esta reserva?"
                onDone={() => setV(v + 1)}
              >
                Cancelar reserva
              </Action>
            )}
          </Panel>
        ))}
      </Status>
    </>
  );
}
export function Facility({
  club,
  id,
  admin,
}: {
  club: string;
  id: string;
  admin: boolean;
}) {
  const base = `/api/clubs/${club}/facilities/${id}`;
  const [v, setV] = useState(0),
    [day, setDay] = useState(
      new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" }),
    ),
    [duration, setDuration] = useState(60);
  const state = useData(base, v);
  const available = useData(
    `${base}/availability?date=${day}&duration=${duration}&step=30`,
    v,
  );
  const schedule = useData(`${base}/schedule`, v);
  const f = state.data?.facility;
  return (
    <>
      <Link href={href("club", { club, tab: "facilities" })}>
        Volver al club
      </Link>
      <h1>{f?.name || "Instalación"}</h1>
      <Status state={state}>
        {f && (
          <>
            <p>{f.description}</p>
            <p>Ubicación: {f.location || "—"}</p>
            {admin && (
              <details>
                <summary>Editar instalación</summary>
                <Form
                  fields={[
                    ...facilityFields,
                    {
                      name: "status",
                      label: "Estado",
                      options: [
                        { value: "ACTIVE", label: "Activa" },
                        { value: "INACTIVE", label: "Inactiva" },
                      ],
                    },
                  ]}
                  initial={f}
                  method="PATCH"
                  url={base}
                  onDone={() => setV(v + 1)}
                />
                <Action
                  url={base}
                  method="DELETE"
                  confirm="¿Desactivar esta instalación?"
                  onDone={() => setV(v + 1)}
                >
                  Desactivar
                </Action>
              </details>
            )}
          </>
        )}
      </Status>
      <Panel title="Horarios">
        <Status state={schedule}>
          {(schedule.data?.schedules || [])
            .filter((r: Row) => !r.isClosed)
            .map((r: Row) => (
              <p key={r.id}>
                {dayNames[days.indexOf(r.dayOfWeek)]}: {r.openingTime} —{" "}
                {r.closingTime}
              </p>
            ))}
        </Status>
      </Panel>
      <Panel title="Disponibilidad y reserva">
        <p>
          Horarios de Ecuador (UTC−05). La disponibilidad se vuelve a comprobar
          al reservar.
        </p>
        <div className="actions">
          <label>
            Fecha
            <input
              type="date"
              value={day}
              onChange={(e) => {
                if (e.target.value) setDay(e.target.value);
              }}
            />
          </label>
          <label>
            Duración en minutos
            <input
              type="number"
              min={1}
              max={1440}
              value={duration}
              onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
            />
          </label>
        </div>
        <Status state={available}>
          {available.data && !available.data.membershipAccess.canReserve && (
            <p className="notice">
              Tu membresía o plan no permite reservar esta instalación en este
              momento.
            </p>
          )}
          {available.data && (
            <p>
              Minutos disponibles para hoy:{" "}
              {available.data.membershipLimits.remainingMinutes}
            </p>
          )}
          <Empty rows={available.data?.bookingOptions.slots || []} />
          <div className="actions">
            {available.data?.membershipAccess.canReserve &&
              available.data.bookingOptions.slots.map((slot: Row) => (
                <Action
                  key={slot.startAt}
                  url={`${base}/reservations`}
                  body={{ startAt: slot.startAt, endAt: slot.endAt }}
                  confirm={`¿Confirmar reserva de ${slot.start} a ${slot.end}?`}
                  onDone={() => setV(v + 1)}
                >
                  {slot.start} — {slot.end}
                </Action>
              ))}
          </div>
        </Status>
      </Panel>
      {admin && (
        <>
          <ScheduleEditor
            key={`s${v}`}
            base={base}
            onDone={() => setV(v + 1)}
          />
          <AccessEditor
            key={`a${v}`}
            club={club}
            base={base}
            onDone={() => setV(v + 1)}
          />
          <Reservations key={v} club={club} facility={id} admin />
        </>
      )}
      {!admin && <Reservations key={v} club={club} />}
    </>
  );
}
function ScheduleEditor({
  base,
  onDone,
}: {
  base: string;
  onDone: () => void;
}) {
  const state = useData(`${base}/schedule`);
  return (
    <details>
      <summary>Configurar horarios</summary>
      <Status state={state}>
        {state.data && (
          <ScheduleForm
            base={base}
            initial={state.data.schedules}
            onDone={onDone}
          />
        )}
      </Status>
    </details>
  );
}
function ScheduleForm({
  base,
  initial,
  onDone,
}: {
  base: string;
  initial: Row[];
  onDone: () => void;
}) {
  const [rows, setRows] = useState(
      initial
        .filter((r) => !r.isClosed)
        .map((r) => ({
          dayOfWeek: r.dayOfWeek,
          openingTime: r.openingTime,
          closingTime: r.closingTime,
        })),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await api(`${base}/schedule`, "PUT", { schedule: rows });
          onDone();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Los días sin intervalos quedan cerrados. Puedes añadir varios intervalos
        por día.
      </p>
      <fieldset disabled={busy}>
        {rows.map((r, i) => (
          <div className="actions" key={i}>
            <label>
              Día
              <select
                value={r.dayOfWeek}
                onChange={(e) =>
                  setRows(
                    rows.map((x, j) =>
                      j === i ? { ...x, dayOfWeek: e.target.value } : x,
                    ),
                  )
                }
              >
                {days.map((d, k) => (
                  <option value={d} key={d}>
                    {dayNames[k]}
                  </option>
                ))}
              </select>
            </label>
            {["openingTime", "closingTime"].map((key) => (
              <label key={key}>
                {key === "openingTime" ? "Apertura" : "Cierre"}
                <input
                  type="time"
                  required
                  value={r[key as keyof typeof r]}
                  onChange={(e) =>
                    setRows(
                      rows.map((x, j) =>
                        j === i ? { ...x, [key]: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
            ))}
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
            >
              Quitar
            </button>
          </div>
        ))}
      </fieldset>
      <div className="actions">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            setRows([
              ...rows,
              {
                dayOfWeek: "MONDAY",
                openingTime: "08:00",
                closingTime: "18:00",
              },
            ])
          }
        >
          Añadir intervalo
        </button>
        <button disabled={busy}>Guardar horarios</button>
      </div>
      <p role="status">{error}</p>
    </form>
  );
}
function AccessEditor({
  club,
  base,
  onDone,
}: {
  club: string;
  base: string;
  onDone: () => void;
}) {
  const plans = useData(`/api/clubs/${club}/membership-plans`),
    access = useData(`${base}/plan-access`);
  return (
    <details>
      <summary>Planes con acceso a esta instalación</summary>
      <Status state={plans}>
        <Status state={access}>
          {plans.data && access.data && (
            <AccessForm
              plans={plans.data.plans}
              initial={access.data.planAccesses}
              base={base}
              onDone={onDone}
            />
          )}
        </Status>
      </Status>
    </details>
  );
}
function AccessForm({
  plans,
  initial,
  base,
  onDone,
}: {
  plans: Row[];
  initial: Row[];
  base: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const planAccesses = plans
          .filter((p) => fd.has(p.id))
          .map((p) => ({
            membershipPlanId: p.id,
            maxReservationMinutesPerDay: Number(fd.get("minutes-" + p.id)),
          }));
        setBusy(true);
        try {
          await api(`${base}/plan-access`, "PUT", { planAccesses });
          onDone();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        {plans.map((p) => {
          const a = initial.find((x) => x.membershipPlanId === p.id);
          return (
            <label key={p.id}>
              <span>
                <input name={p.id} type="checkbox" defaultChecked={!!a} />{" "}
                {p.name}
              </span>
              Minutos por día
              <input
                name={"minutes-" + p.id}
                type="number"
                min={1}
                required
                defaultValue={a?.maxReservationMinutesPerDay || 60}
              />
            </label>
          );
        })}
      </fieldset>
      <button disabled={busy}>Guardar accesos</button>
      <p role="status">{error}</p>
    </form>
  );
}
