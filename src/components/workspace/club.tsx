"use client";
import {AvatarImage} from "@/components/avatar-image";
import {ClubBankForm} from "./finance-controls";
import {ClubHero} from "./club-hero";
import {PostCard} from "./post-card";
import { PlanCard } from "./plan-card";
import { ClubSidebar } from "./club-sidebar";
import {Requirements} from "./requirements";
import {PostComposer} from "./post-composer";
import {Location} from "./location";
import { NoticeCount } from "./notice-count";
import { Activity, Bars } from "./activity";
import { EditorModal } from "./modal";
import { Icon, PLACEHOLDER_IMAGE } from "@/components/ui";
import { useState } from "react";
import Link from "next/link";
import { UploadDropzone } from "@/lib/uploadthing";
import { api, Badge, useData, Panel, Status, Form, Action, Empty, Pager, href, label, date, money, safeUrl, clubFields, planFields, requirementFields, postFields, type Row, } from "./common";
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
    const [noticeError, setNoticeError] = useState("");
    async function readTab(key:string) {
      if (!["applications","overview","reservations"].includes(key)) return;
      try {
        await api("/api/me/notifications", "PATCH", {clubId:club,tab:key});
        setNoticeError("");
        window.dispatchEvent(new Event("klubo-notifications"));
      } catch { setNoticeError("No se pudieron marcar las novedades como leídas."); }
    }
    return (<>
      <ClubHero club={state.data?.club}/>
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
        ].map(([key, title]) => (<Link scroll={false} key={key} onClick={()=>void readTab(key)} aria-current={tab === key ? "page" : undefined} href={href("club", { club, tab: key })}>
              {title}{(["applications","reservations","overview","members"].includes(key)) && <NoticeCount club={club} kind={key as "applications" | "reservations" | "overview" | "members"}/>}
            </Link>))}
        </nav>
        {noticeError && <p role="alert">{noticeError}</p>}
        {tab === "posts" && <div className="club-post-layout"><section><Posts club={club} admin={admin}/></section><ClubSidebar club={club} admin={admin}/></div>}
        {tab === "facilities" && <Facilities club={club} admin={admin}/>}
        {tab === "reservations" && <Reservations club={club}/>}
        {admin && tab === "plans" && <Plans club={club}/>}
        {admin && tab === "members" && <Members club={club}/>}
        {admin && tab === "applications" && <Applications club={club}/>}
        {admin && tab === "payments" && <ClubPayments club={club}/>}
        {admin && tab === "overview" && <Activity club={club}/>}
        {admin && tab === "settings" && state.data && (<div className="club-settings"><Panel title="Editar perfil del club">
            <Form fields={clubFields} initial={state.data.club} url={base} onDone={() => setVersion(v => v + 1)} method="PATCH"/>
            <div className="club-image-settings">{(["logo","cover"] as const).map(kind=><section key={kind}>{safeUrl(state.data?.club[kind+"Url"])&&(kind==="logo"?<AvatarImage className="settings-logo" src={safeUrl(state.data?.club.logoUrl)} alt="Logotipo actual"/>:<img className="settings-cover" src={safeUrl(state.data?.club.coverUrl)} alt="Portada actual"/>)}<UploadFeedback endpoint={kind==="logo"?"clubLogoUploader":"clubCoverUploader"} input={{clubId:club}} onDone={()=>setVersion(v=>v+1)}/><h3>{kind==="logo"?"Logotipo":"Portada"}</h3>{state.data?.club[kind+"Url"]&&<Action url={base} method="PATCH" body={kind==="logo"?{clearLogo:true}:{clearCover:true}} confirm="¿Quitar esta imagen?" onDone={()=>setVersion(v=>v+1)}>Quitar imagen</Action>}</section>)}</div>
            <Action url={`${base}/suspend`} confirm="¿Suspender el club y sus membresías? Se intentará cancelar las suscripciones recurrentes. Solo la administración global puede reactivarlo.">
              Suspender club
            </Action>
          </Panel><ClubBankForm club={club}/></div>)}
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
      <UploadDropzone content={{label:"Arrastra una imagen o haz clic para elegir",allowedContent:"Imagen · Máximo 4 MB",button:"Guardar imagen"}} config={{mode:"auto"}} endpoint={endpoint} input={input as {
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
      <div className="list-heading"><div><h2>Publicaciones</h2><small>Últimas novedades</small></div>{admin&&<EditorModal title="Crear publicación"><PostComposer club={club} onDone={()=>setV(v=>v+1)}/></EditorModal>}</div>
      <div><Status state={state}>
        <Empty rows={state.data?.posts || []}/>
        {state.data?.posts.map((p: Row) => (<PostCard key={p.id} post={p} admin={admin} onChanged={()=>setV(v=>v+1)}/>))}
        <Pager data={state.data} page={page} onPage={setPage}/>{!!state.data?.posts?.length && !state.data.pagination.hasNextPage && <p className="feed-end">✓ Estás al día con las novedades del club</p>}
      </Status></div>
    </>);
}
function Plans({ club }: {
    club: string;
}) {
    const [v, setV] = useState(0);
    const base = `/api/clubs/${club}/membership-plans`;
    const state = useData(base, v);
    return (<>
      <div className="list-heading"><h2>Planes y requisitos documentales</h2>
      <EditorModal title="Crear plan">
        <Form fields={planFields} initial={{ price: 0, durationValue: 1 }} url={base} onDone={() => setV(v + 1)}/>
      </EditorModal></div>
      <Status state={state}>
        <Empty rows={state.data?.plans || []}/>
        <div className="bounded-cards">
        {state.data?.plans.map((p: Row) => (<PlanCard key={p.id} plan={p}>
            <EditorModal title="Editar plan">
              <Form key={String(p.updatedAt)+String(p.requiresDocumentation)} fields={planFields} initial={p} url={`${base}/${p.id}`} method="PATCH" onDone={() => setV(v + 1)}/>
            </EditorModal>
            {p.isActive && (<Action url={`${base}/${p.id}`} method="DELETE" confirm="¿Desactivar este plan?" onDone={() => setV(v + 1)}>
                Desactivar
              </Action>)}

          </PlanCard>))}
        </div>
        <Requirements club={club} plans={state.data?.plans||[]} onChanged={()=>setV(v=>v+1)}/>
      </Status>
    </>);
}
function Members({club}:{club:string}){
 const [version,setVersion]=useState(0);
 const state=useData(`/api/clubs/${club}/members`,version);
 const members:Row[]=state.data?.members||[];
 const current=(m:Row)=>m.status==="ACTIVE"&&(m.role==="CLUB_ADMIN"||m.plans?.length>0);
 return <><h2>Miembros del club</h2><Status state={state}>{[true,false].map(active=><section className="member-section" key={String(active)}><h3>{active?"Miembros activos":"Historial de miembros"}</h3><div className="bounded-cards member-cards">{members.filter(m=>Boolean(current(m))===active).map(m=><Panel key={m.membershipId} title={m.user.firstName+" "+m.user.lastName}>
 <span className="member-avatar">{safeUrl(m.user.avatarUrl)?<AvatarImage src={safeUrl(m.user.avatarUrl)} alt=""/>:m.user.firstName.slice(0,1)+m.user.lastName.slice(0,1)}</span><p>{m.user.email}</p><p>{label(m.role)} · <Badge value={m.status}/></p>{m.role!=="CLUB_ADMIN"&&<p>{m.plans?.map((p:Row)=>p.plan.name).join(", ")||"Sin plan vigente"}</p>}
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

      <Status state={summary}>
        {summary.data && (<Panel title="Resumen del período">
            <div className="metrics-grid">{[["Ingresos brutos", summary.data.summary.grossAmount], ["Comisiones", summary.data.summary.totalFees], ["Neto del club", summary.data.summary.netAmount]].map(([title, value]) => <dl className="metric-card" key={String(title)}><dt>{title}</dt><dd>{money(value)}</dd></dl>)}</div>
            <small>
              Este resumen usa la fecha de creación de los pagos; puede diferir
              del panel financiero que usa la fecha de pago.
            </small>
          </Panel>)}
      </Status>
      <Status state={activity}><Bars title="Ingresos diarios (USD)" yAxis="Ingresos (USD)" xAxis="Días" calendar="day" series={["Pagos confirmados"]} rows={Object.entries(activity.data?.series || {}).map(([label, r]) => ({ label, values: [Object.values((r as Row).incomeCents).reduce((sum: number, v) => sum + Number(v), 0) / 100] }))}/></Status>
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
