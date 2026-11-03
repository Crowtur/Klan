"use client";
import { Icon } from "@/components/ui";
import { useState } from "react";
import Link from "next/link";
import { UploadButton } from "@/lib/uploadthing";
import { Badge, useData, Panel, Status, Form, Action, Empty, Pager, href, label, date, money, safeUrl, clubFields, planFields, requirementFields, postFields, type Row, } from "./common";
import { Facilities, Reservations } from "./facilities";
import { Dashboard } from "./dashboard";
export function Club({ club, tab = "posts", admin, }: {
    club: string;
    tab?: string;
    admin: boolean;
}) {
    const [version, setVersion] = useState(0);
    const state = useData(`/api/clubs/${club}`, version);
    const base = `/api/clubs/${club}`;
    return (<>
      <div className="club-identity"><span className="avatar">{safeUrl(state.data?.club.logoUrl) ? <img src={safeUrl(state.data?.club.logoUrl)} alt=""/> : <Icon name="users" size={30}/>}</span><div><p className="eyebrow">{admin ? "Administración del club" : "Tu comunidad"}</p><h1>{state.data?.club.name || "Club"}</h1><p>{state.data?.club.description}</p></div></div>
      <Status state={state}>
        <nav className="tabs" aria-label="Secciones del club">
          {[
            ["posts", "Publicaciones"],
            ["facilities", "Instalaciones"],
            ["reservations", "Mis reservas"],
            ...(admin
                ? [
                    ["overview", "Resumen"],
                    ["members", "Miembros"],
                    ["plans", "Planes"],
                    ["applications", "Solicitudes"],
                    ["payments", "Pagos"],
                    ["settings", "Configuración"],
                ]
                : []),
        ].map(([key, title]) => (<Link key={key} aria-current={tab === key ? "page" : undefined} href={href("club", { club, tab: key })}>
              {title}
            </Link>))}
        </nav>
        {tab === "posts" && <Posts club={club} admin={admin}/>}
        {tab === "facilities" && <Facilities club={club} admin={admin}/>}
        {tab === "reservations" && <Reservations club={club}/>}
        {admin && tab === "plans" && <Plans club={club}/>}
        {admin && tab === "members" && <Members club={club}/>}
        {admin && tab === "applications" && <Applications club={club}/>}
        {admin && tab === "payments" && <ClubPayments club={club}/>}
        {admin && tab === "overview" && <Dashboard club={club}/>}
        {admin && tab === "settings" && state.data && (<Panel title="Configuración del club">
            <Form fields={clubFields} initial={state.data.club} url={base} onDone={() => setVersion(v => v + 1)} method="PATCH"/>
            <h3>Logotipo</h3>
            <UploadFeedback endpoint="clubLogoUploader" input={{ clubId: club }} onDone={() => setVersion(v => v + 1)}/>
            <Action url={`${base}/suspend`} confirm="¿Suspender el club y sus membresías? Se intentará cancelar las suscripciones recurrentes. Solo la administración global puede reactivarlo.">
              Suspender club
            </Action>
          </Panel>)}
      </Status>
    </>);
}
export function UploadFeedback({ endpoint, input, onDone, }: {
    endpoint: "clubLogoUploader" | "postImageUploader";
    input: {
        clubId: string;
        postId?: string;
    };
    onDone?: () => void;
}) {
    const [msg, setMsg] = useState("");
    return (<>
      <UploadButton endpoint={endpoint} input={input as {
        clubId: string;
        postId: string;
    }} onClientUploadComplete={() => {
            setMsg("Imagen guardada.");
            onDone?.();
        }} onUploadError={(e) => setMsg(e.message)}/>
      <p role="status">{msg}</p>
    </>);
}
export function Posts({ club, admin, canUpload = admin, }: {
    club: string;
    admin: boolean;
    canUpload?: boolean;
}) {
    const [v, setV] = useState(0), [page, setPage] = useState(1);
    const base = `/api/clubs/${club}/posts`;
    const state = useData(`${base}?page=${page}&limit=10`, v);
    return (<>
      <h2>Publicaciones</h2>
      {admin && (<details>
          <summary>Crear publicación</summary>
          <Form fields={postFields} url={base} onDone={() => setV(v + 1)}/>
        </details>)}
      <Status state={state}>
        <Empty rows={state.data?.posts || []}/>
        {state.data?.posts.map((p: Row) => (<Panel key={p.id} title={p.title || "Publicación"}>
            <p style={{ whiteSpace: "pre-wrap" }}>{p.content}</p>
            {safeUrl(p.imageUrl) && (<img src={safeUrl(p.imageUrl)} alt={p.title || "Publicación"}/>)}
            <small>{date(p.updatedAt)}</small>
            {admin && (<details>
                <summary>Editar publicación e imagen</summary>
                <Form fields={postFields} initial={p} url={`${base}/${p.id}`} method="PATCH" onDone={() => setV(v + 1)}/>
                {canUpload && (<UploadFeedback endpoint="postImageUploader" input={{ clubId: club, postId: p.id }} onDone={() => setV(v + 1)}/>)}
                <Action url={`${base}/${p.id}`} method="DELETE" confirm="¿Eliminar esta publicación definitivamente?" onDone={() => setV(v + 1)}>
                  Eliminar publicación
                </Action>
              </details>)}
          </Panel>))}
        <Pager data={state.data} page={page} onPage={setPage}/>
      </Status>
    </>);
}
function Plans({ club }: {
    club: string;
}) {
    const [v, setV] = useState(0);
    const base = `/api/clubs/${club}/membership-plans`;
    const state = useData(base, v);
    return (<>
      <h2>Planes de membresía</h2>
      <details>
        <summary>Crear plan</summary>
        <Form fields={planFields} initial={{ price: 0, durationValue: 1 }} url={base} onDone={() => setV(v + 1)}/>
      </details>
      <Status state={state}>
        <Empty rows={state.data?.plans || []}/>
        <div className="grid">
        {state.data?.plans.map((p: Row) => (<Panel key={p.id} title={p.name}>
            <p>
              {money(p.price)} / {p.durationValue} {label(p.durationUnit)} ·{" "}
              {p.isActive ? "Disponible" : "Desactivado"}
            </p>
            <p>{p.description}</p>
            <details>
              <summary>Editar plan</summary>
              <Form fields={planFields} initial={p} url={`${base}/${p.id}`} method="PATCH" onDone={() => setV(v + 1)}/>
            </details>
            {p.isActive && (<Action url={`${base}/${p.id}`} method="DELETE" confirm="¿Desactivar este plan?" onDone={() => setV(v + 1)}>
                Desactivar
              </Action>)}
            <Requirements base={`${base}/${p.id}/document-requirements`}/>
          </Panel>))}
        </div>
      </Status>
    </>);
}
function Requirements({ base }: {
    base: string;
}) {
    const [v, setV] = useState(0);
    const state = useData(base, v);
    return (<details>
      <summary>Requisitos documentales</summary>
      <Form fields={requirementFields} initial={{ isRequired: true }} url={base} submit="Añadir requisito" onDone={() => setV(v + 1)}/>
      <Status state={state}>
        {state.data?.requirements.map((r: Row) => (<Panel key={r.id} title={r.name}>
            <p>
              {r.description} · {r.isRequired ? "Obligatorio" : "Opcional"}
            </p>
            <Form fields={requirementFields} initial={r} url={`${base}/${r.id}`} method="PATCH" onDone={() => setV(v + 1)}/>
            <Action url={`${base}/${r.id}`} method="DELETE" confirm="¿Desactivar este requisito?" onDone={() => setV(v + 1)}>
              Desactivar requisito
            </Action>
          </Panel>))}
      </Status>
    </details>);
}
function Members({ club }: {
    club: string;
}) {
    const [v, setV] = useState(0);
    const state = useData(`/api/clubs/${club}/members`, v);
    return (<>
      <h2>Miembros</h2>
      <Status state={state}>
        <Empty rows={state.data?.members || []}/>
        <div className="grid">
        {state.data?.members.map((m: Row) => (<Panel key={m.membershipId} title={`${m.user.firstName} ${m.user.lastName}`}>
            <p>{m.user.email}</p>
            <p>
              {label(m.role)} · <Badge value={m.status}/>
            </p>
            {m.role === "MEMBER" && m.status !== "REMOVED" && (<details>
                <summary>Retirar del club</summary>
                <p>
                  Esta acción retira la membresía y cancela sus suscripciones.
                </p>
                <Form fields={[
                    { name: "reason", label: "Motivo", type: "textarea" },
                ]} url={`/api/clubs/${club}/members/${m.user.id}`} method="DELETE" submit="Confirmar retiro" onDone={() => setV(v + 1)}/>
              </details>)}
          </Panel>))}
        </div>
      </Status>
    </>);
}
function Applications({ club }: {
    club: string;
}) {
    const [v, setV] = useState(0);
    const state = useData(`/api/clubs/${club}/membership-applications`, v);
    return (<>
      <h2>Solicitudes de ingreso</h2>
      <button onClick={() => setV(v + 1)}>Actualizar</button>
      <Status state={state}>
        <Empty rows={state.data?.applications || []}/>
        <div className="grid">
        {state.data?.applications.map((a: Row) => (<Panel key={a.id} title={`${a.user.firstName} ${a.user.lastName}`}>
            <p>
              {a.user.email} · {a.plan.name} · <Badge value={a.status}/>
            </p>
            <ApplicationReview club={club} application={a} onDone={() => setV(v + 1)}/>
          </Panel>))}
        </div>
      </Status>
    </>);
}
function ApplicationReview({ club, application, onDone, }: {
    club: string;
    application: Row;
    onDone: () => void;
}) {
    const base = `/api/clubs/${club}/membership-applications/${application.id}`;
    const [v, setV] = useState(0);
    const state = useData(`${base}/documents`, v);
    const fields = [
        {
            name: "status",
            label: "Decisión",
            options: [
                { value: "APPROVED", label: "Aprobar" },
                { value: "REJECTED", label: "Rechazar" },
            ],
        },
        { name: "rejectionReason", label: "Motivo de rechazo", type: "textarea" },
    ];
    return (<details>
      <summary>Revisar documentos y solicitud</summary>
      <Status state={state}>
        <Empty rows={state.data?.documents || []}/>
        {state.data?.documents.map((d: Row) => (<Panel key={d.id} title={d.requirement?.name || d.fileName || "Documento"}>
            <a href={safeUrl(d.fileUrl)} target="_blank" rel="noreferrer">
              Abrir documento
            </a>
            <p>
              {label(d.status)} · {d.rejectionReason}
            </p>
            {["PENDING", "DOCUMENTATION_REVIEW"].includes(application.status) && (<Form fields={fields} url={`${base}/documents/${d.id}`} method="PATCH" onDone={() => setV(v + 1)} submit="Guardar revisión de documento"/>)}
          </Panel>))}
      </Status>
      {["PENDING", "DOCUMENTATION_REVIEW"].includes(application.status) && (<Form fields={fields} url={`${base}/review`} method="PATCH" submit="Guardar decisión de solicitud" onDone={onDone}/>)}
    </details>);
}
function ClubPayments({ club }: {
    club: string;
}) {
    const [period, setPeriod] = useState(new Date()
        .toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })
        .slice(0, 7));
    const [year, month] = period.split("-");
    const query = `year=${year}&month=${Number(month)}`;
    const state = useData(`/api/clubs/${club}/payments?${query}`);
    const summary = useData(`/api/clubs/${club}/payments/summary?${query}`);
    return (<>
      <h2>Pagos del club</h2>
      <label>
        Período
        <input type="month" min="2000-01" max="2100-12" value={period} onChange={(e) => {
            if (e.target.value)
                setPeriod(e.target.value);
        }}/>
      </label>
      <Status state={summary}>
        {summary.data && (<Panel title="Resumen del período">
            <div className="metrics-grid">{[["Ingresos brutos",summary.data.summary.grossAmount],["Comisiones",summary.data.summary.totalFees],["Neto del club",summary.data.summary.netAmount]].map(([title,value])=><dl className="metric-card" key={String(title)}><dt>{title}</dt><dd>{money(value)}</dd></dl>)}</div>
            <small>
              Este resumen usa la fecha de creación de los pagos; puede diferir
              del panel financiero que usa la fecha de pago.
            </small>
          </Panel>)}
      </Status>
      <Status state={state}>
        <Empty rows={state.data?.payments || []}/>
        <div className="grid">
        {state.data?.payments.map((p: Row) => (<Panel key={p.id} title={p.user ? `${p.user.firstName} ${p.user.lastName}` : "Pago"}>
            <p>
              {money(p.amount, p.currency)} · <Badge value={p.status}/>
            </p>
            <p>{p.subscription?.plan?.name}</p>
            <p>{date(p.createdAt)}</p>
          </Panel>))}
        </div>
      </Status>
    </>);
}
