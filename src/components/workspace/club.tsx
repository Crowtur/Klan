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
import {useMobile} from "../use-mobile";
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
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UploadDropzone } from "@/lib/uploadthing";
import { api, Badge, useData, Panel, Status, Form, Action, Empty, Pager, href, label, date, money, safeUrl, clubFields, planFields, requirementFields, postFields, type Row, } from "./common";
import { Facilities, Reservations } from "./facilities";
import { Dashboard } from "./dashboard";
/** En pantallas estrechas los mismos enlaces forman una lista vertical. Compartirlos evita duplicar
 * los contadores de avisos y conserva la navegación de Next y el marcado de lectura en ambos tamaños.
 */
function ClubSections({club,tab,admin,readTab}:{
  club:string; tab:string; admin:boolean; readTab:(key:string)=>Promise<void>;
}) {
  // Móvil: la lista parte cerrada. El foco vuelve al selector al elegir una sección o pulsar Escape.
  const [open,setOpen]=useState(false);
  const nav=useRef<HTMLElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  // Móvil: al abandonar el club, recorrer el historial o redimensionar a escritorio, descartar la apertura previa.
  useEffect(()=>{
    if(!open) return;
    const mobile=window.matchMedia("(width < 768px)");
    // Un toque fuera también debe cerrar en navegadores que no enfocan el elemento pulsado.
    function outside(event:PointerEvent) {
      if(event.target instanceof Node && !nav.current?.contains(event.target)) setOpen(false);
    }
    // Al recuperar el ancho de escritorio, dejar la lista preparada para el siguiente acceso móvil.
    function resized() { if(!mobile.matches) setOpen(false); }
    // El historial puede cambiar la pestaña sin que se active uno de nuestros enlaces.
    function historyChanged() { setOpen(false); }
    document.addEventListener("pointerdown",outside);
    mobile.addEventListener("change",resized);
    window.addEventListener("popstate",historyChanged);
    return ()=>{
      document.removeEventListener("pointerdown",outside);
      mobile.removeEventListener("change",resized);
      window.removeEventListener("popstate",historyChanged);
    };
  },[open]);
  // Ambos diseños derivan del mismo conjunto de secciones permitidas para este rol.
  const sections=[
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
        ];
  const current=sections.find(([key])=>key===tab)?.[1] ?? "Secciones del club";
  // La ruta y el efecto de lectura son los originales. Solo un selector abierto requiere restaurar el foco.
  function select(key:string) {
    if(open) { setOpen(false); trigger.current?.focus(); }
    void readTab(key);
  }
  return <nav ref={nav} className="tabs club-sections" aria-label="Secciones del club" data-open={open}
    onKeyDown={event=>{
      // Escape cierra la lista sin navegar ni modificar los avisos.
      if(open && event.key==="Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    }} onBlur={event=>{
      // Al tabular fuera de la navegación, retirar la lista del orden de lectura.
      if(open && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
    {/* Oculto de origen: únicamente la regla móvil puede hacerlo visible y enfocable. */}
    <button ref={trigger} type="button" style={{display:"none"}} className="club-section-trigger"
      aria-expanded={open} aria-label={`Sección del club: ${current}`} onClick={()=>setOpen(value=>!value)}>
      {current}<span aria-hidden="true">▾</span>
    </button>
    {sections.map(([key,title])=><Link scroll={false} key={key} onClick={()=>select(key)}
      aria-current={tab===key?"page":undefined} href={href("club",{club,tab:key})}>
      {title}{(["applications","reservations","overview","members"].includes(key)) && <NoticeCount club={club} kind={key as "applications" | "reservations" | "overview" | "members"}/>}
    </Link>)}
  </nav>;
}

/** Selecciona los módulos de la pestaña activa y habilita la administración según el rol en este club. */
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
      {!state.error && <ClubHero club={state.data?.club?.id===club ? state.data.club : undefined}/>}
      <Status state={state}>
        {/* Móvil: el selector reutiliza los enlaces, permisos y avisos de las pestañas originales. */}
        <ClubSections club={club} tab={tab} admin={admin} readTab={readTab}/>
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
            <div className="club-image-settings">{(["logo","cover"] as const).map(kind=><section key={kind}>{safeUrl(state.data?.club[kind+"Url"])&&(kind==="logo"?<AvatarImage className="settings-logo" src={safeUrl(state.data?.club.logoUrl)} alt="Logotipo actual"/>:<img className="settings-cover" src={safeUrl(state.data?.club.coverUrl)} alt="Portada actual"/>)}<UploadFeedback endpoint={kind==="logo"?"clubLogoUploader":"clubCoverUploader"} input={{clubId:club}} onDone={()=>setVersion(v=>v+1)}/><h3>{kind==="logo"?"Logotipo":"Portada"}</h3>{state.data?.club[kind+"Url"]&&<Action variant="destructive" url={base} method="PATCH" body={kind==="logo"?{clearLogo:true}:{clearCover:true}} confirm="¿Quitar esta imagen?" onDone={()=>setVersion(v=>v+1)}>Quitar imagen</Action>}</section>)}</div>
            <Action variant="destructive" url={`${base}/suspend`} confirm="¿Suspender el club y sus membresías? Se intentará cancelar las suscripciones recurrentes. Solo la administración global puede reactivarlo.">
              Suspender club
            </Action>
          </Panel><ClubBankForm club={club}/></div>)}
      </Status>
    </>);
}
/** Muestra la confirmación o el error de la carga e informa a la vista cuando debe refrescarse. */
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
/** Pagina publicaciones del club y refresca la lista cuando cambia una publicación. */
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
/** Comparte la tarjeta del catálogo con el editor del club y coordina planes y requisitos. */
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
/** Fila móvil compartida por miembros actuales, históricos y solicitantes.
 * El menú de gestión permanece en su componente original para respetar permisos y confirmaciones. */
function PersonRow({user, role, plans, status, children}: {
    user:Row; role:string; plans:string; status:string; children:React.ReactNode;
}) {
    const name = [user.firstName,user.lastName].filter(Boolean).join(" ");
    return <article className="person-row">
        <span className="member-avatar">{safeUrl(user.avatarUrl)
            ? <AvatarImage src={safeUrl(user.avatarUrl)} alt=""/>
            : (user.firstName?.[0] || "") + (user.lastName?.[0] || "")}</span>
        <div className="person-copy"><strong title={name}>{name}</strong><small title={user.email}>{user.email}</small>
            <small>{role} · {plans}</small></div>
        <div className="person-controls"><Badge value={status}/>{children}</div>
    </article>;
}

/** Presenta las membresías por estado y permite documentar el motivo de la retirada. */
function Members({club}:{club:string}){
 const [version,setVersion]=useState(0);
 const state=useData(`/api/clubs/${club}/members`,version);
 const members:Row[]=state.data?.members||[];
 // La misma colección y la misma comprobación de permisos alimentan las dos presentaciones.
 const mobile = useMobile();
 const current=(m:Row)=>m.status==="ACTIVE"&&(m.role==="CLUB_ADMIN"||m.plans?.length>0);
 return <><h2>Miembros del club</h2><Status state={state}>{[true,false].map(active=><section className="member-section" key={String(active)}><h3>{active?"Miembros activos":"Historial de miembros"}</h3><div className="bounded-cards member-cards">{members.filter(m=>Boolean(current(m))===active).map(m=>{
 // La acción de retiro se construye una vez y conserva el motivo y el refresco de la lista.
 const action = active&&m.role==="MEMBER"&&<EditorModal destructive title="Retirar del club"><p>Confirma el retiro de {m.user.firstName}.</p><Form fields={[{name:"reason",label:"Motivo",type:"textarea"}]} url={`/api/clubs/${club}/members/${m.user.id}`} method="DELETE" submit="Confirmar retiro" onDone={()=>setVersion(v=>v+1)}/></EditorModal>;
 if (mobile) return <PersonRow key={m.membershipId} user={m.user} role={label(m.role)}
     plans={m.plans?.map((item:Row)=>item.plan.name).join(", ") || "Sin plan vigente"}
     status={m.status}>{action}</PersonRow>;
 return <Panel key={m.membershipId} title={m.user.firstName+" "+m.user.lastName}>
 <span className="member-avatar">{safeUrl(m.user.avatarUrl)?<AvatarImage src={safeUrl(m.user.avatarUrl)} alt=""/>:m.user.firstName.slice(0,1)+m.user.lastName.slice(0,1)}</span><p>{m.user.email}</p><p>{label(m.role)} · <Badge value={m.status}/></p>{m.role!=="CLUB_ADMIN"&&<p>{m.plans?.map((p:Row)=>p.plan.name).join(", ")||"Sin plan vigente"}</p>}
 {action}
 </Panel>})}</div>{!members.some(m=>Boolean(current(m))===active)&&<p>No hay miembros en esta sección.</p>}</section>)}</Status></>;
}
/** Lista las solicitudes del club y abre el expediente seleccionado para revisión. */
function Applications({ club }: {
    club: string;
}) {
    const [v, setV] = useState(0);
    // Móvil muestra el solicitante y el plan en la misma fila, conservando la revisión del expediente.
    const mobile = useMobile();
    const state = useData(`/api/clubs/${club}/membership-applications`, v);
    return (<>
      <h2>Solicitudes de ingreso</h2>

      <Status state={state}>
        <Empty rows={state.data?.applications || []}/>
        <div className={mobile ? "person-list" : "grid"}>
        {state.data?.applications.map((a: Row) => {
            // Compartir el mismo diálogo impide que la vista compacta omita documentos o decisiones.
            const review = <EditorModal title="Revisar documentos y solicitud" lazy>
              <ApplicationReview club={club} application={a} onDone={() => setV(v + 1)}/>
            </EditorModal>;
            if (mobile) return <PersonRow key={a.id} user={a.user} role="Solicitante" plans={a.plan.name} status={a.status}>{review}</PersonRow>;
            return <Panel key={a.id} title={`${a.user.firstName} ${a.user.lastName}`}>
            <p>
              {a.user.email} · {a.plan.name} · <Badge value={a.status}/>
            </p>
            {review}
          </Panel>})}
        </div>
      </Status>
    </>);
}
/** Reúne los documentos del expediente. Cada revisión de archivo incluye su versión para detectar ediciones simultáneas. */
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
    return (<>
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
    </>);
}
/** Aplica el período y la paginación al historial financiero del club. */
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
      {/* El formato USD se aplica únicamente a las etiquetas visibles en el diagrama móvil. */}
      <Status state={activity}><Bars mobileTimeline currency title="Ingresos diarios (USD)" yAxis="Ingresos (USD)" xAxis="Días" calendar="day" series={["Pagos confirmados"]} rows={Object.entries(activity.data?.series || {}).map(([label, r]) => ({ label, values: [Object.values((r as Row).incomeCents).reduce((sum: number, v) => sum + Number(v), 0) / 100] }))}/></Status>
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
