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

// La interfaz incorpora los nuevos flujos conservando rutas Entity y textos visibles de Círculo.

// Refactorización Parte 12 (UI-Only): Se muestra 'Círculo/Círculos' al usuario manteniendo 'Entity' en código, rutas y BD.

// Refactorización Parte 11: gestión de la entidad con las mismas reglas de permisos, distribución y comportamiento móvil.

"use client";
import {useMobile} from "../use-mobile";
import {AvatarImage} from "@/components/avatar-image";
import {EntityBankForm} from "./finance-controls";
import {EntityHero} from "./entity-hero";
import {EntityRules} from "./entity-rules";
import {PostCard} from "./post-card";
import { PlanCard } from "./plan-card";
import { EntitySidebar } from "./entity-sidebar";
import {Requirements} from "./requirements";
import {PostComposer} from "./post-composer";
import {Location} from "./location";
import { NoticeCount } from "./notice-count";
import { Activity, Bars } from "./activity";
import { EditorModal } from "./modal";
import { Icon, PLACEHOLDER_IMAGE } from "@/components/ui";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ImageFilePicker } from "@/components/image-file-picker";
import {generateReactHelpers} from "@uploadthing/react";
import type {OurFileRouter} from "@/app/api/uploadthing/core";
const {useUploadThing}=generateReactHelpers<OurFileRouter>();
import { api, Badge, useData, Panel, Status, Form, Action, Empty, Pager, href, label, date, money, safeUrl, entityFields, planFields, requirementFields, postFields, type Row, } from "./common";
import { Facilities, Reservations } from "./facilities";
import { Dashboard } from "./dashboard";
/** En pantallas estrechas los mismos enlaces forman una lista vertical. Compartirlos evita duplicar
 * los contadores de avisos y conserva la navegación de Next y el marcado de lectura en ambos tamaños.
 */
function EntitySections({entity,tab,admin,readTab}:{
  entity:string; tab:string; admin:boolean; readTab:(key:string)=>Promise<void>;
}) {
  // Móvil: la lista parte cerrada. El foco vuelve al selector al elegir una sección o pulsar Escape.
  const [open,setOpen]=useState(false);
  const nav=useRef<HTMLElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  // Móvil: al abandonar la entidad, recorrer el historial o redimensionar a escritorio, descartar la apertura previa.
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
            ["rules", "Reglas"],
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
  const current=sections.find(([key])=>key===tab)?.[1] ?? "Secciones del círculo";
  // La ruta y el efecto de lectura son los originales. Solo un selector abierto requiere restaurar el foco.
  function select(key:string) {
    if(open) { setOpen(false); trigger.current?.focus(); }
    void readTab(key);
  }
  return <nav ref={nav} className="tabs entity-sections" aria-label="Secciones del círculo" data-open={open}
    onKeyDown={event=>{
      // Escape cierra la lista sin navegar ni modificar los avisos.
      if(open && event.key==="Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    }} onBlur={event=>{
      // Al tabular fuera de la navegación, retirar la lista del orden de lectura.
      if(open && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
    {/* Oculto de origen: únicamente la regla móvil puede hacerlo visible y enfocable. */}
    <button ref={trigger} type="button" style={{display:"none"}} className="entity-section-trigger"
      aria-expanded={open} aria-label={`Sección del círculo: ${current}`} onClick={()=>setOpen(value=>!value)}>
      {current}<span aria-hidden="true">▾</span>
    </button>
    {sections.map(([key,title])=><Link scroll={false} key={key} onClick={()=>select(key)}
      aria-current={tab===key?"page":undefined} href={href("entity",{entity,tab:key})}>
      {title}{(["applications","reservations","overview","members"].includes(key)) && <NoticeCount entity={entity} kind={key as "applications" | "reservations" | "overview" | "members"}/>}
    </Link>)}
  </nav>;
}

/** Selecciona los módulos de la pestaña activa y habilita la administración según el rol en esta entidad. */
export function Entity({ entity, tab = "posts", admin, }: {
    entity: string;
    tab?: string;
    admin: boolean;
}) {
    const [version, setVersion] = useState(0);
    const state = useData(`/api/entities/${entity}`, version);
    const base = `/api/entities/${entity}`;
    const [noticeError, setNoticeError] = useState("");
    async function readTab(key:string) {
      if (!["applications","overview","reservations"].includes(key)) return;
      try {
        await api("/api/me/notifications", "PATCH", {entityId:entity,tab:key});
        setNoticeError("");
        window.dispatchEvent(new Event("klubo-notifications"));
      } catch { setNoticeError("No se pudieron marcar las novedades como leídas."); }
    }
    return (<>
      {!state.error && <EntityHero entity={state.data?.entity?.id===entity ? state.data.entity : undefined}/>}
      <Status state={state}>
        {/* Móvil: el selector reutiliza los enlaces, permisos y avisos de las pestañas originales. */}
        <EntitySections entity={entity} tab={tab} admin={admin} readTab={readTab}/>
        {noticeError && <p role="alert">{noticeError}</p>}
        {tab === "posts" && <div className="entity-post-layout"><section><Posts entity={entity} admin={admin}/></section><EntitySidebar entity={entity} admin={admin}/></div>}
        {tab === "facilities" && <Facilities entity={entity} admin={admin}/>}
        {tab === "rules" && <EntityRules entity={entity} admin={admin}/>}
        {tab === "reservations" && <Reservations entity={entity}/>}
        {admin && tab === "plans" && <Plans entity={entity}/>}
        {admin && tab === "members" && <Members entity={entity}/>}
        {admin && tab === "applications" && <Applications entity={entity}/>}
        {admin && tab === "payments" && <EntityPayments entity={entity}/>}
        {admin && tab === "overview" && <Activity entity={entity}/>}
        {admin && tab === "settings" && state.data && (<div className="entity-settings"><Panel title="Editar perfil del círculo">
            <Form fields={entityFields} initial={state.data.entity} url={base} onDone={() => setVersion(v => v + 1)} method="PATCH"/>
            <div className="entity-image-settings">{(["logo","cover"] as const).map(kind=><section key={kind}>{safeUrl(state.data?.entity[kind+"Url"])&&(kind==="logo"?<AvatarImage className="settings-logo" src={safeUrl(state.data?.entity.logoUrl)} alt="Logotipo actual"/>:<img className="settings-cover" src={safeUrl(state.data?.entity.coverUrl)} alt="Portada actual"/>)}<UploadFeedback endpoint={kind==="logo"?"entityLogoUploader":"entityCoverUploader"} input={{entityId:entity}} onDone={()=>setVersion(v=>v+1)}/><h3>{kind==="logo"?"Logotipo":"Portada"}</h3>{state.data?.entity[kind+"Url"]&&<Action variant="destructive" url={base} method="PATCH" body={kind==="logo"?{clearLogo:true}:{clearCover:true}} confirm="¿Quitar esta imagen?" onDone={()=>setVersion(v=>v+1)}>Quitar imagen</Action>}</section>)}</div>
            <Action variant="destructive" url={`${base}/suspend`} confirm="¿Suspender el círculo y sus membresías? Se intentará cancelar las suscripciones recurrentes. Solo la administración global puede reactivarlo.">
              Suspender círculo
            </Action>
          </Panel><EntityBankForm entity={entity}/></div>)}
      </Status>
    </>);
}
/** Muestra la confirmación o el error de la carga e informa a la vista cuando debe refrescarse. */
export function UploadFeedback({ endpoint, input, onDone, }: {
    endpoint: "entityCoverUploader" | "entityLogoUploader" | "postImageUploader";
    input: {
        entityId: string;
        postId?: string;
    };
    onDone?: () => void;
}) {
    const {startUpload}=useUploadThing(endpoint);
    return <ImageFilePicker aspect={endpoint==="entityLogoUploader"?1:endpoint==="entityCoverUploader"?3:undefined} onFile={async file=>{const result=await startUpload([file],input as {entityId:string;postId:string});if(!result?.[0]?.serverData?.persisted)throw Error("No se pudo guardar la imagen");onDone?.();}}/>;
}
/** Pagina publicaciones de la entidad y refresca la lista cuando cambia una publicación. */
export function Posts({ entity, admin, canUpload = admin, }: {
    entity: string;
    admin: boolean;
    canUpload?: boolean;
}) {
    const [v, setV] = useState(0), [page, setPage] = useState(1);
    const base = `/api/entities/${entity}/posts`;
    const state = useData(`${base}?page=${page}&limit=10`, v);
    return (<>
      <div className="list-heading"><div><h2>Publicaciones</h2><small>Últimas novedades</small></div>{admin&&<EditorModal title="Crear publicación"><PostComposer entity={entity} onDone={()=>setV(v=>v+1)}/></EditorModal>}</div>
      <div><Status state={state}>
        <Empty rows={state.data?.posts || []}/>
        {state.data?.posts.map((p: Row) => (<PostCard key={p.id} post={p} admin={admin} onChanged={()=>setV(v=>v+1)}/>))}
        <Pager data={state.data} page={page} onPage={setPage}/>{!!state.data?.posts?.length && !state.data.pagination.hasNextPage && <p className="feed-end">✓ Estás al día con las novedades del círculo</p>}
      </Status></div>
    </>);
}
/** Comparte la tarjeta del catálogo con el editor de la entidad y coordina planes y requisitos. */
function Plans({ entity }: {
    entity: string;
}) {
    const [v, setV] = useState(0);
    const base = `/api/entities/${entity}/membership-plans`;
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
              <Form key={String(p.updatedAt)} fields={planFields} initial={p} url={`${base}/${p.id}`} method="PATCH" onDone={() => setV(v + 1)}/>
            </EditorModal>
            {p.isActive && (<Action url={`${base}/${p.id}`} method="DELETE" confirm="¿Desactivar este plan?" onDone={() => setV(v + 1)}>
                Desactivar
              </Action>)}

          </PlanCard>))}
        </div>
        <Requirements entity={entity} plans={state.data?.plans||[]} onChanged={()=>setV(v=>v+1)}/>
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
function Members({entity}:{entity:string}){
 const [version,setVersion]=useState(0);
 const state=useData(`/api/entities/${entity}/members`,version);
 const members:Row[]=state.data?.members||[];
 // La misma colección y la misma comprobación de permisos alimentan las dos presentaciones.
 const mobile = useMobile();
 const current=(m:Row)=>m.status==="ACTIVE"&&(m.role==="ENTITY_ADMIN"||m.plans?.length>0);
 return <><h2>Miembros del círculo</h2><Status state={state}>{[true,false].map(active=><section className="member-section" key={String(active)}><h3>{active?"Miembros activos":"Historial de miembros"}</h3><div className="bounded-cards member-cards">{members.filter(m=>Boolean(current(m))===active).map(m=>{
 // La acción de retiro se construye una vez y conserva el motivo y el refresco de la lista.
 const action = active&&m.role==="MEMBER"&&<EditorModal destructive title="Retirar del círculo"><p>Confirma el retiro de {m.user.firstName}.</p><Form fields={[{name:"reason",label:"Motivo",type:"textarea"}]} url={`/api/entities/${entity}/members/${m.user.id}`} method="DELETE" submit="Confirmar retiro" onDone={()=>setVersion(v=>v+1)}/></EditorModal>;
 if (mobile) return <PersonRow key={m.membershipId} user={m.user} role={label(m.role)}
     plans={m.plans?.map((item:Row)=>item.plan.name).join(", ") || "Sin plan vigente"}
     status={m.status}>{action}</PersonRow>;
 return <Panel key={m.membershipId} title={m.user.firstName+" "+m.user.lastName}>
 <span className="member-avatar">{safeUrl(m.user.avatarUrl)?<AvatarImage src={safeUrl(m.user.avatarUrl)} alt=""/>:m.user.firstName.slice(0,1)+m.user.lastName.slice(0,1)}</span><p>{m.user.email}</p><p>{label(m.role)} · <Badge value={m.status}/></p>{m.role!=="ENTITY_ADMIN"&&<p>{m.plans?.map((p:Row)=>p.plan.name).join(", ")||"Sin plan vigente"}</p>}
 {action}
 </Panel>})}</div>{!members.some(m=>Boolean(current(m))===active)&&<p>No hay miembros en esta sección.</p>}</section>)}</Status></>;
}
/** Lista las solicitudes de la entidad y abre el expediente seleccionado para revisión. */
function Applications({ entity }: {
    entity: string;
}) {
    const [v, setV] = useState(0);
    // Móvil muestra el solicitante y el plan en la misma fila, conservando la revisión del expediente.
    const mobile = useMobile();
    const state = useData(`/api/entities/${entity}/membership-applications`, v);
    return (<>
      <h2>Solicitudes de ingreso</h2>

      <Status state={state}>
        <Empty rows={state.data?.applications || []}/>
        <div className={mobile ? "person-list" : "grid"}>
        {state.data?.applications.map((a: Row) => {
            // Compartir el mismo diálogo impide que la vista compacta omita documentos o decisiones.
            const review = <EditorModal title="Revisar documentos y solicitud" lazy>
              <ApplicationReview entity={entity} application={a} onDone={() => setV(v + 1)}/>
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
function ApplicationReview({ entity, application, onDone, }: {
    entity: string;
    application: Row;
    onDone: () => void;
}) {
    const base = `/api/entities/${entity}/membership-applications/${application.id}`;
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
/** Aplica el período y la paginación al historial financiero de la entidad. */
function EntityPayments({ entity }: {
    entity: string;
}) {
    const [period, setPeriod] = useState(new Date()
        .toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })
        .slice(0, 7));
    const [year, month] = period.split("-");
    const [page, setPage] = useState(1);
    const activity = useData(`/api/entities/${entity}/dashboard/activity?start=${period}-01&end=${period}-${new Date(Number(year), Number(month), 0).getDate()}&group=day`);
    const query = `year=${year}&month=${Number(month)}&page=${page}&limit=20`;
    const state = useData(`/api/entities/${entity}/payments?${query}`);
    const summary = useData(`/api/entities/${entity}/payments/summary?${query}`);
    return (<>
      <div className="list-heading"><h2>Pagos del círculo</h2><a className="btn btn-outline" href={`/api/entities/${entity}/payments?${query}&format=csv`}>↓ Exportar CSV</a></div>
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
            <div className="metrics-grid">{[["Ingresos brutos", summary.data.summary.grossAmount], ["Comisiones", summary.data.summary.totalFees], ["Neto del círculo", summary.data.summary.netAmount]].map(([title, value]) => <dl className="metric-card" key={String(title)}><dt>{title}</dt><dd>{money(value)}</dd></dl>)}</div>
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
