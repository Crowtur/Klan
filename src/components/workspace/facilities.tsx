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
import {AvatarImage} from "@/components/avatar-image";
import {Icon} from "@/components/ui";
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
/** Lista las instalaciones y habilita su creación para el administrador del club. */
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
/** Comparte el listado entre el club y la instalación. El estado y el final del intervalo determinan si se puede cancelar. */
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
        <div className="bounded-cards reservation-cards">
        {state.data?.reservations.map((r: Row) => (<Panel key={r.id} title={r.facility?.name || "Reserva"}>
            <p>{new Date(r.startAt).toLocaleDateString("es-EC", {dateStyle:"long", timeZone:"America/Guayaquil"})}</p>
            <p className="reservation-time"><Icon name="clock" size={16}/>{new Date(r.startAt).toLocaleTimeString("es-EC", {hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"America/Guayaquil"})} · {Math.round((Date.parse(r.endAt)-Date.parse(r.startAt))/60000)} min</p>
            <p><Badge value={r.status==="CONFIRMED" && Date.parse(r.endAt)<=Date.now()?"RESERVATION_EXPIRED":r.status}/></p>{r.clubMembership?.user && <p>Reserva de {r.clubMembership.user.firstName} {r.clubMembership.user.lastName}</p>}
            {r.status === "CONFIRMED" && Date.parse(r.endAt)>Date.now() && (<Action variant="destructive" method="PATCH" url={`${base}/facilities/${r.facilityId || facility}/reservations/${r.id}`} confirm="¿Cancelar esta reserva?" onDone={() => { setV(v + 1); onChanged?.(); }}>
                Cancelar reserva
              </Action>)}
          </Panel>))}
        </div>
      </Status>
    </>);
}
/** Reserva móvil del prototipo U10. La selección guarda solo el inicio; antes de confirmar
 * se recupera la franja de la disponibilidad vigente para evitar enviar opciones obsoletas. */
function MobileBooking({ slots, base, onDone }: { slots: Row[]; base: string; onDone: () => void }) {
    const [start, setStart] = useState<string | null>(null);
    const selected = slots.find(slot => slot.startAt === start);

    return <div className="mobile-booking">
        {/* La cuadrícula permite comparar las horas. Tocar una opción todavía no crea la reserva. */}
        <div className="booking-options" role="group" aria-label="Franjas disponibles">
            {slots.map(slot => <button key={slot.startAt} type="button"
                aria-pressed={selected?.startAt === slot.startAt}
                onClick={() => setStart(slot.startAt)}>{slot.start} – {slot.end}</button>)}
        </div>
        {/* La acción reutiliza el bloqueo de doble envío y los mensajes de error del flujo de escritorio. */}
        {selected && <div className="booking-selection">
            <small>Franja seleccionada</small>
            <strong>{selected.start} – {selected.end}</strong>
            <Action key={selected.startAt} url={base + "/reservations"}
                body={{ startAt: selected.startAt, endAt: selected.endAt }}
                onDone={onDone}>Confirmar reserva</Action>
        </div>}
    </div>;
}

/** Combina la ficha con disponibilidad por día y duración. Actualiza horarios y reservas después de cada operación. */
export function Facility({ club, id, admin, }: {
    club: string;
    id: string;
    admin: boolean;
}) {
    const base = `/api/clubs/${club}/facilities/${id}`;
    const [v, setV] = useState(0), [day, setDay] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })), [duration, setDuration] = useState(60);
    const state = useData(base, v);
    // El aviso persiste mientras la consulta se actualiza y desmonta la franja recién reservada.
    const [bookingNotice, setBookingNotice] = useState("");
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
            // La nueva consulta corresponde a otra fecha; retirar la confirmación de la anterior.
            if (e.target.value) {
                setBookingNotice("");
                setDay(e.target.value);
            }
        }}/>
          </label>
          <label>
            Duración en minutos
            <input type="number" min={1} max={1440} value={duration} onChange={(e) => {
                // La duración cambia las franjas disponibles y deja atrás la operación anterior.
                setBookingNotice("");
                setDuration(Math.max(1, Number(e.target.value)));
            }}/>
          </label>
        </div>
        {/* El aviso queda fuera del estado de carga para que el lector de pantalla anuncie la confirmación. */}
        <p className="mobile-booking-notice" role="status">{bookingNotice}</p>
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
          {/* Reiniciar la selección al cambiar la consulta o después de confirmar una reserva. */}
          {available.data?.membershipAccess.canReserve && <MobileBooking key={JSON.stringify([base, day, duration, v])}
              slots={available.data.bookingOptions.slots} base={base} onDone={() => {
                  setBookingNotice("Reserva confirmada.");
                  setV(version => version + 1);
              }}/>}
          <div className="reservation-slots">
            {available.data?.membershipAccess.canReserve &&
            available.data.bookingOptions.slots.map((slot: Row) => (<Action key={slot.startAt} url={`${base}/reservations`} body={{ startAt: slot.startAt, endAt: slot.endAt }} confirm={`¿Confirmar reserva de ${slot.start} a ${slot.end}?`} onDone={() => setV(v + 1)}>
                  {slot.start} — {slot.end}
                </Action>))}
          </div>
        </Status>
      </Panel>
      </div>{admin && (<>
          <div className="facility-tools"><EditorModal key={`s${v}`} title="Configurar horarios" lazy>
            <Status state={schedule}>
              {schedule.data && <ScheduleForm base={base} initial={schedule.data.schedules} onDone={() => setV(v + 1)}/>}
            </Status>
          </EditorModal>
          <EditorModal key={`a${v}`} title="Planes con acceso a esta instalación" lazy>
            <AccessEditor club={club} base={base} onDone={() => setV(v + 1)}/>
          </EditorModal>
          </div><Reservations key={v} club={club} facility={id} admin onChanged={() => setV(v + 1)}/>
        </>)}
      {!admin && <Reservations key={v} club={club} onChanged={() => setV(v + 1)}/>}
    </>);
}
/** Mantiene intervalos editables por día y envía el conjunto de horarios al guardar. */
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
      {/* Cada intervalo ocupa una fila completa; la rejilla alinea los controles por su borde inferior. */}
      <fieldset className="schedule-intervals" disabled={busy}>
        {rows.map((r, i) => (<div className="schedule-interval" key={i}>
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
            <button type="button" className="outline-destructive" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
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
/** Consulta los permisos de acceso para los planes de la instalación. */
function AccessEditor({ club, base, onDone, }: {
    club: string;
    base: string;
    onDone: () => void;
}) {
    const plans = useData(`/api/clubs/${club}/membership-plans`), access = useData(`${base}/plan-access`);
    return (
      <Status state={plans}>
        <Status state={access}>
          {plans.data && access.data && (<AccessForm plans={plans.data.plans} initial={access.data.planAccesses} base={base} onDone={onDone}/>)}
        </Status>
      </Status>
    );
}
/** Convierte la selección de planes y sus límites diarios en los permisos que recibe el servidor. */
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
