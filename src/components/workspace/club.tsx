"use client";
import { NoticeCount } from "./notice-count";
import { Activity, Bars } from "./activity";
import { EditorModal } from "./modal";
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
      {safeUrl(state.data?.club.coverUrl) && <img className="identity-cover" src={safeUrl(state.data?.club.coverUrl)} alt="Portada del club"/>}<div className="club-identity"><span className="avatar">{safeUrl(state.data?.club.logoUrl) ? <img src={safeUrl(state.data?.club.logoUrl)} alt=""/> : <Icon name="users" size={30}/>}</span><div><p className="eyebrow">{admin ? "Administración del club" : "Tu comunidad"}</p><h1>{state.data?.club.name || "Club"}</h1><p>{state.data?.club.description}</p>{state.data?.club.address && <p>{state.data.club.address}</p>}{safeUrl(state.data?.club.googleMapsUrl) && <a className="text-link" href={safeUrl(state.data?.club.googleMapsUrl)} target="_blank" rel="noreferrer">Ver en Google Maps ↗</a>}</div></div>
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
              {title}{(key === "applications" || key === "reservations") && <NoticeCount club={club} kind={key}/>}
            </Link>))}
        </nav>
        {tab === "posts" && <Posts club={club} admin={admin}/>}
        {tab === "facilities" && <Facilities club={club} admin={admin}/>}
        {tab === "reservations" && <Reservations club={club}/>}
        {admin && tab === "plans" && <Plans club={club}/>}
        {admin && tab === "members" && <Members club={club}/>}
        {admin && tab === "applications" && <Applications club={club}/>}
        {admin && tab === "payments" && <ClubPayments club={club}/>}
        {admin && tab === "overview" && <Activity club={club}/>}
        {admin && tab === "settings" && state.data && (<Panel title="Configuración del club">
            <Form fields={clubFields} initial={state.data.club} url={base} onDone={() => setVersion(v => v + 1)} method="PATCH"/>
            <h3>Portada</h3>{state.data.club.coverUrl && <Action url={base} method="PATCH" body={{ clearCover: true }} confirm="¿Quitar la portada?" onDone={() => setVersion(v => v + 1)}>Quitar portada</Action>}<UploadFeedback endpoint="clubCoverUploader" input={{ clubId: club }} onDone={() => setVersion(v => v + 1)}/><h3>Logotipo</h3>{state.data.club.logoUrl && <Action url={base} method="PATCH" body={{ clearLogo: true }} confirm="¿Quitar el logotipo?" onDone={() => setVersion(v => v + 1)}>Quitar logotipo</Action>}
            <UploadFeedback endpoint="clubLogoUploader" input={{ clubId: club }} onDone={() => setVersion(v => v + 1)}/>
            <Action url={`${base}/suspend`} confirm="¿Suspender el club y sus membresías? Se intentará cancelar las suscripciones recurrentes. Solo la administración global puede reactivarlo.">
              Suspender club
            </Action>
          </Panel>)}
      </Status>
    </>);
}
export function UploadFeedback({ endpoint, input, onDone, }: {
    endpoint: "clubCoverUploader" | "clubLogoUploader" | "postImageUploader";
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
    const [created, setCreated] = useState<string | null>(null);
    const [v, setV] = useState(0), [page, setPage] = useState(1);
    const base = `/api/clubs/${club}/posts`;
    const state = useData(`${base}?page=${page}&limit=10`, v);
    return (<>
      <h2>Publicaciones</h2>
      {admin && (<EditorModal title="Crear publicación">
          {created ? <><p>Publicación creada. Añade su imagen.</p><UploadFeedback endpoint="postImageUploader" input={{ clubId: club, postId: created }} onDone={() => setV(v => v + 1)}/><button className="secondary" onClick={() => setCreated(null)}>Crear otra publicación</button></> : <Form fields={postFields} url={base} onDone={d => { setCreated(d.post.id); setV(v => v + 1); }}/>}
        </EditorModal>)}
      <Status state={state}>
        <Empty rows={state.data?.posts || []}/>
        {state.data?.posts.map((p: Row) => (<Panel key={p.id} title={p.title || "Publicación"}>
            <p style={{ whiteSpace: "pre-wrap" }}>{p.content}</p>
            {safeUrl(p.imageUrl) && (<img src={safeUrl(p.imageUrl)} alt={p.title || "Publicación"}/>)}
            <small>{date(p.updatedAt)}</small>
            {admin && (<EditorModal title="Editar publicación e imagen">
                <Form fields={postFields} initial={p} url={`${base}/${p.id}`} method="PATCH" onDone={() => setV(v + 1)}/>
                {canUpload && (<UploadFeedback endpoint="postImageUploader" input={{ clubId: club, postId: p.id }} onDone={() => setV(v + 1)}/>)}
                {p.imageUrl && <Action url={`${base}/${p.id}`} method="PATCH" body={{ removeImage: true }} confirm="¿Quitar la imagen de esta publicación?" onDone={() => setV(v + 1)}>Quitar imagen</Action>}
                <Action url={`${base}/${p.id}`} method="DELETE" confirm="¿Eliminar esta publicación definitivamente?" onDone={() => setV(v + 1)}>
                  Eliminar publicación
                </Action>
              </EditorModal>)}
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
      <EditorModal title="Crear plan">
        <Form fields={planFields} initial={{ price: 0, durationValue: 1 }} url={base} onDone={() => setV(v + 1)}/>
      </EditorModal>
      <Status state={state}>
        <Empty rows={state.data?.plans || []}/>
        <div className="grid">
        {state.data?.plans.map((p: Row) => (<Panel key={p.id} title={p.name}>
            <p>
              {money(p.price)} / {p.durationValue} {label(p.durationUnit)} ·{" "}
              {p.isActive ? "Disponible" : "Desactivado"}
            </p>
            <p>{p.description}</p>{Array.isArray(p.benefits) && <ul className="plan-benefits">{p.benefits.map((b: string) => <li key={b}>{b}</li>)}</ul>}
            <EditorModal title="Editar plan">
              <Form fields={planFields} initial={p} url={`${base}/${p.id}`} method="PATCH" onDone={() => setV(v + 1)}/>
            </EditorModal>
            {p.isActive && (<Action url={`${base}/${p.id}`} method="DELETE" confirm="¿Desactivar este plan?" onDone={() => setV(v + 1)}>
                Desactivar
              </Action>)}

          </Panel>))}
        </div>
        <section className="requirements-section"><h2>Requisitos documentales</h2><p>Selecciona un plan y administra los documentos necesarios para ingresar.</p>
        {state.data?.plans.map((p: Row) => <section className="panel" key={p.id}><h3>{p.name}</h3><Requirements base={`${base}/${p.id}/document-requirements`}/></section>)}</section>
      </Status>
    </>);
}
function Requirements({ base }: {
    base: string;
}) {
    const [v, setV] = useState(0);
    const state = useData(base, v);
    return (<section>
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
    </section>);
}
function Members({club}:{club:string}){
 const [version,setVersion]=useState(0);
 const state=useData(`/api/clubs/${club}/members`,version);
 const members:Row[]=state.data?.members||[];
 const current=(m:Row)=>m.status==="ACTIVE"&&(m.role==="CLUB_ADMIN"||m.plans?.length>0);
 return <><h2>Miembros del club</h2><Status state={state}>{[true,false].map(active=><section key={String(active)}><h3>{active?"Miembros activos":"Historial de miembros"}</h3><div className="grid">{members.filter(m=>Boolean(current(m))===active).map(m=><Panel key={m.membershipId} title={m.user.firstName+" "+m.user.lastName}>
 {safeUrl(m.user.avatarUrl)&&<img className="member-photo" src={safeUrl(m.user.avatarUrl)} alt=""/>}<p>{m.user.email}</p><p>{label(m.role)} · <Badge value={m.status}/></p><p>{m.role==="CLUB_ADMIN"?"Administrador":m.plans?.map((p:Row)=>p.plan.name).join(", ")||"Sin plan vigente"}</p>
 {active&&m.role==="MEMBER"&&<EditorModal title="Retirar del club"><p>Confirma el retiro de {m.user.firstName}.</p><Form fields={[{name:"reason",label:"Motivo",type:"textarea"}]} url={`/api/clubs/${club}/members/${m.user.id}`} method="DELETE" submit="Confirmar retiro" onDone={()=>setVersion(v=>v+1)}/></EditorModal>}
 </Panel>)}</div>{!members.some(m=>Boolean(current(m))===active)&&<p>No hay miembros en esta sección.</p>}</section>)}</Status></>;
}
function Applications({ club }: {
    club: string;
}) {
    const [v, setV] = useState(0);
    const state = useData(`/api/clubs/${club}/membership-applications`, v);
    return (<>
      <h2>Solicitudes de ingreso</h2>

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
    return (<EditorModal title="Revisar documentos y solicitud">
      <Status state={state}>
        <Empty rows={state.data?.documents || []}/>
        {state.data?.documents.map((d: Row) => (<Panel key={d.id} title={d.requirement?.name || d.fileName || "Documento"}>
            <a className="btn btn-outline" href={safeUrl(d.fileUrl)} target="_blank" rel="noreferrer">
              Abrir documento
            </a>
            <p>
              {label(d.status)} · {d.rejectionReason}
            </p>
            {["PENDING", "DOCUMENTATION_REVIEW"].includes(application.status) && (<Form fields={fields} url={`${base}/documents/${d.id}`} method="PATCH" transform={body => ({ ...body, version: d.version })} onDone={() => setV(v + 1)} submit="Guardar revisión de documento"/>)}
          </Panel>))}
      </Status>
      {["PENDING", "DOCUMENTATION_REVIEW"].includes(application.status) && (<Form fields={fields} url={`${base}/review`} method="PATCH" submit="Guardar decisión de solicitud" onDone={onDone}/>)}
    </EditorModal>);
}
function ClubPayments({ club }: {
    club: string;
}) {
    const [period, setPeriod] = useState(new Date()
        .toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })
        .slice(0, 7));
    const [year, month] = period.split("-");
    const [page, setPage] = useState(1);
    const activity = useData(`/api/clubs/${club}/dashboard/activity?start=${period}-01&end=${period}-${new Date(Number(year), Number(month), 0).getDate()}&group=day`);
    const query = `year=${year}&month=${Number(month)}&page=${page}&limit=20`;
    const state = useData(`/api/clubs/${club}/payments?${query}`);
    const summary = useData(`/api/clubs/${club}/payments/summary?${query}`);
    return (<>
      <div className="list-heading"><h2>Pagos del club</h2><a className="btn btn-outline" href={`/api/clubs/${club}/payments?${query}&format=csv`}>↓ Exportar CSV</a></div>
      <label>
        Período
        <input type="month" min="2000-01" max="2100-12" value={period} onChange={(e) => {
            if (e.target.value) {
                setPeriod(e.target.value);
                setPage(1);
            }
        }}/>
      </label>
      <Status state={activity}><Bars title="Ingresos diarios (USD)" series={["Pagos confirmados"]} rows={Object.entries(activity.data?.series || {}).map(([label, r]) => ({ label, values: [Object.values((r as Row).incomeCents).reduce((sum: number, v) => sum + Number(v), 0) / 100] }))}/></Status>
      <Status state={summary}>
        {summary.data && (<Panel title="Resumen del período">
            <div className="metrics-grid">{[["Ingresos brutos", summary.data.summary.grossAmount], ["Comisiones", summary.data.summary.totalFees], ["Neto del club", summary.data.summary.netAmount]].map(([title, value]) => <dl className="metric-card" key={String(title)}><dt>{title}</dt><dd>{money(value)}</dd></dl>)}</div>
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
        </div><Pager data={state.data} page={page} onPage={setPage}/>
      </Status>
    </>);
}
