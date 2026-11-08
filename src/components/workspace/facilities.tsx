"use client";
import {AvatarImage} from "@/components/avatar-image";
import {FacilityIcon} from "./facility-icon";
import {Location} from "./location";
import { EditorModal } from "./modal";
import { useState } from "react";
import Link from "next/link";
import { Badge, api, useData, Status, Panel, Form, Action, Empty, href, date, label, facilityFields, safeUrl, type Row, } from "./common";
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
export function Facilities({ club, admin }: {
    club: string;
    admin: boolean;
}) {
    const [v, setV] = useState(0);
    const base = `/api/clubs/${club}/facilities`;
    const state = useData(base, v);
    return (<>
      <div className="list-heading"><div><h2>Instalaciones <small>{state.data?.facilities.length}</small></h2><p>Explora los espacios del club y encuentra el lugar para tu próxima actividad.</p></div>
      {admin && (<EditorModal title="Crear instalación">
          <Form fields={facilityFields} url={base} onDone={() => setV(v + 1)}/>
        </EditorModal>)}</div>
      <Status state={state}>
        <Empty rows={state.data?.facilities || []}/>
        <div className="bounded-cards">
        {state.data?.facilities.map((f: Row) => (<article key={f.id} className="panel facility-tile"><header><h3>{f.name}</h3><FacilityIcon value={f.icon}/></header><p>{f.description}</p><Location value={f.location}/><div className="facility-meta"><small>Capacidad: {f.capacity??"—"}</small><Badge value={f.status}/></div>
    <footer><Link className="btn btn-outline" href={href("facility",{club,id:f.id})}>Consultar y reservar</Link></footer></article>))}
        </div>{!!state.data?.facilities.length && <div className="facility-meta"><small>Mostrando {state.data.facilities.length} de {state.data.facilities.length} instalaciones</small><small>{state.data.facilities.every((f:Row)=>f.status==="ACTIVE")?"Todas las instalaciones están activas":""}</small></div>}
      </Status>
    </>);
}
export function Reservations({ club, facility, admin = false, onChanged, }: {
    club: string;
    facility?: string;
    admin?: boolean;
    onChanged?: () => void;
}) {
    const [v, setV] = useState(0);
    const base = `/api/clubs/${club}`;
    const state = useData(facility
        ? `${base}/facilities/${facility}/reservations`
        : `${base}/my-reservations`, v);
    return (<>
      <h2>{admin ? "Reservas de la instalación" : "Mis reservas"}</h2>
      <Status state={state}>
        <Empty rows={state.data?.reservations || []}/>
        <div className="grid">
        {state.data?.reservations.map((r: Row) => (<Panel key={r.id} title={r.facility?.name || "Reserva"}>
            <p>
              {date(r.startAt)} — {date(r.endAt)} (Ecuador)
            </p>
            <p><Badge value={r.status==="CONFIRMED" && Date.parse(r.endAt)<=Date.now()?"RESERVATION_EXPIRED":r.status}/></p>{r.clubMembership?.user && <p>Reserva de {r.clubMembership.user.firstName} {r.clubMembership.user.lastName}</p>}
            {r.status === "CONFIRMED" && Date.parse(r.endAt)>Date.now() && (<Action method="PATCH" url={`${base}/facilities/${r.facilityId || facility}/reservations/${r.id}`} confirm="¿Cancelar esta reserva?" onDone={() => { setV(v + 1); onChanged?.(); }}>
                Cancelar reserva
              </Action>)}
          </Panel>))}
        </div>
      </Status>
    </>);
}
export function Facility({ club, id, admin, }: {
    club: string;
    id: string;
    admin: boolean;
}) {
    const base = `/api/clubs/${club}/facilities/${id}`;
    const [v, setV] = useState(0), [day, setDay] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })), [duration, setDuration] = useState(60);
    const state = useData(base, v);
    const available = useData(`${base}/availability?date=${day}&duration=${duration}&step=30`, v);
    const schedule = useData(`${base}/schedule`, v);
    const identity=useData(`/api/clubs/${club}`);
    const f = state.data?.facility;
    return (<>
      <Link className="btn btn-outline back-button" href={href("club", { club, tab: "facilities" })}>
        Volver al club
      </Link>
      {identity.data?.club&&<div className="club-identity"><span className="avatar">{safeUrl(identity.data.club.logoUrl)&&<AvatarImage src={safeUrl(identity.data.club.logoUrl)} alt=""/>}</span><div><h2>{identity.data.club.name}</h2><p>{identity.data.club.description}</p></div></div>}
      <h1>{f?.name || "Instalación"}</h1>
      <Status state={state}>
        {f && (<>
            <div className="facility-description"><div><p>{f.description}</p>
            <Location value={f.location}/></div>
            {admin && (<EditorModal title="Editar instalación">
                <Form fields={[
                    ...facilityFields,
                    {
                        name: "status",
                        label: "Estado",
                        options: [
                            { value: "ACTIVE", label: "Activa" },
                            { value: "INACTIVE", label: "Inactiva" },
                        ],
                    },
                ]} initial={f} method="PATCH" url={base} onDone={() => setV(v + 1)}/>
                <Action url={base} method="DELETE" confirm="¿Desactivar esta instalación?" onDone={() => setV(v + 1)}>
                  Desactivar
                </Action>
              </EditorModal>)}</div>
          </>)}
      </Status>
      <div className="facility-booking"><Panel title="Horarios">
        <Status state={schedule}>
          <div className="week-schedule">{days.map((day, i) => { const intervals = (schedule.data?.schedules || []).filter((r: Row) => r.dayOfWeek === day && !r.isClosed); return <div className={intervals.length ? "open-day" : ""} key={day}><strong>{dayNames[i]}</strong>{intervals.length ? intervals.map((r: Row) => <small key={r.id}>{r.openingTime} – {r.closingTime}</small>) : <small>Cerrado</small>}</div>; })}</div>
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
            <input type="date" value={day} onChange={(e) => {
            if (e.target.value)
                setDay(e.target.value);
        }}/>
          </label>
          <label>
            Duración en minutos
            <input type="number" min={1} max={1440} value={duration} onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}/>
          </label>
        </div>
        <Status state={available}>
          {available.data && !available.data.membershipAccess.canReserve && (<p className="notice">
              Tu membresía o plan no permite reservar esta instalación en este
              momento.
            </p>)}
          {available.data && (<p>
              Minutos disponibles para este día:{" "}
              {available.data.membershipLimits.remainingMinutes}
            </p>)}
          <Empty rows={available.data?.bookingOptions.slots || []}/>
          <div className="reservation-slots">
            {available.data?.membershipAccess.canReserve &&
            available.data.bookingOptions.slots.map((slot: Row) => (<Action key={slot.startAt} url={`${base}/reservations`} body={{ startAt: slot.startAt, endAt: slot.endAt }} confirm={`¿Confirmar reserva de ${slot.start} a ${slot.end}?`} onDone={() => setV(v + 1)}>
                  {slot.start} — {slot.end}
                </Action>))}
          </div>
        </Status>
      </Panel>
      </div>{admin && (<>
          <div className="facility-tools"><ScheduleEditor key={`s${v}`} base={base} onDone={() => setV(v + 1)}/>
          <AccessEditor key={`a${v}`} club={club} base={base} onDone={() => setV(v + 1)}/>
          </div><Reservations key={v} club={club} facility={id} admin onChanged={() => setV(v + 1)}/>
        </>)}
      {!admin && <Reservations key={v} club={club} onChanged={() => setV(v + 1)}/>}
    </>);
}
function ScheduleEditor({ base, onDone, }: {
    base: string;
    onDone: () => void;
}) {
    const state = useData(`${base}/schedule`);
    return (<EditorModal title="Configurar horarios">
      <Status state={state}>
        {state.data && (<ScheduleForm base={base} initial={state.data.schedules} onDone={onDone}/>)}
      </Status>
    </EditorModal>);
}
function ScheduleForm({ base, initial, onDone, }: {
    base: string;
    initial: Row[];
    onDone: () => void;
}) {
    const [rows, setRows] = useState(initial
        .filter((r) => !r.isClosed)
        .map((r) => ({
        dayOfWeek: r.dayOfWeek,
        openingTime: r.openingTime,
        closingTime: r.closingTime,
    }))), [busy, setBusy] = useState(false), [error, setError] = useState("");
    return (<form onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
                await api(`${base}/schedule`, "PUT", { schedule: rows });
                onDone();
            }
            catch (e) {
                setError((e as Error).message);
            }
            finally {
                setBusy(false);
            }
        }}>
      <p>
        Los días sin intervalos quedan cerrados. Puedes añadir varios intervalos
        por día.
      </p>
      <fieldset disabled={busy}>
        {rows.map((r, i) => (<div className="actions" key={i}>
            <label>
              Día
              <select value={r.dayOfWeek} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, dayOfWeek: e.target.value } : x))}>
                {days.map((d, k) => (<option value={d} key={d}>
                    {dayNames[k]}
                  </option>))}
              </select>
            </label>
            {["openingTime", "closingTime"].map((key) => (<label key={key}>
                {key === "openingTime" ? "Apertura" : "Cierre"}
                <input type="time" required value={r[key as keyof typeof r]} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, [key]: e.target.value } : x))}/>
              </label>))}
            <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
              Quitar
            </button>
          </div>))}
      </fieldset>
      <div className="actions">
        <button type="button" disabled={busy} onClick={() => setRows([
            ...rows,
            {
                dayOfWeek: "MONDAY",
                openingTime: "08:00",
                closingTime: "18:00",
            },
        ])}>
          Añadir intervalo
        </button>
        <button disabled={busy}>Guardar horarios</button>
      </div>
      <p role="status">{error}</p>
    </form>);
}
function AccessEditor({ club, base, onDone, }: {
    club: string;
    base: string;
    onDone: () => void;
}) {
    const plans = useData(`/api/clubs/${club}/membership-plans`), access = useData(`${base}/plan-access`);
    return (<EditorModal title="Planes con acceso a esta instalación">
      <Status state={plans}>
        <Status state={access}>
          {plans.data && access.data && (<AccessForm plans={plans.data.plans} initial={access.data.planAccesses} base={base} onDone={onDone}/>)}
        </Status>
      </Status>
    </EditorModal>);
}
function AccessForm({ plans, initial, base, onDone, }: {
    plans: Row[];
    initial: Row[];
    base: string;
    onDone: () => void;
}) {
    const [busy, setBusy] = useState(false), [error, setError] = useState("");
    return (<form onSubmit={async (e) => {
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
            }
            catch (e) {
                setError((e as Error).message);
            }
            finally {
                setBusy(false);
            }
        }}>
      <fieldset disabled={busy}>
        {plans.map((p) => {
            const a = initial.find((x) => x.membershipPlanId === p.id);
            return (<label key={p.id}>
              <span>
                <input name={p.id} type="checkbox" defaultChecked={!!a}/>{" "}
                {p.name}
              </span>
              Minutos por día
              <input name={"minutes-" + p.id} type="number" min={1} required defaultValue={a?.maxReservationMinutesPerDay || 60}/>
            </label>);
        })}
      </fieldset>
      <button disabled={busy}>Guardar accesos</button>
      <p role="status">{error}</p>
    </form>);
}
