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
import {PublicPlans} from "./public-plans";
import { Location } from "./location";
import { CreateClub } from "./create-club";
import { EditorModal } from "./modal";
import { Icon, PageHeading, PLACEHOLDER_IMAGE } from "@/components/ui";
import { ClubCard } from "./explore";
import {ClubHero} from "./club-hero";
import {PostCard} from "./post-card";
import { useEffect,useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UploadButton, UploadDropzone } from "@/lib/uploadthing";
import { Badge, api, useData, Panel, Status, Empty, Pager, Action, Form, href, label, date, money, safeUrl, clubFields, type Row, } from "./common";
/** Selecciona los datos del módulo personal y deriva las acciones a partir del estado de cada solicitud o suscripción. */
export function Personal({ view, q = "" }: {
    view: string;
    q?: string;
}) {
    const router = useRouter();
    const [page, setPage] = useState(1), [term, setTerm] = useState(q), [search, setSearch] = useState(q), [version, refresh] = useState(0), [message, setMessage] = useState(""), [paying, setPaying] = useState(false);
    const config: Record<string, [
        string,
        string,
        string
    ]> = {
        feed: ["Inicio", "/api/feed", "posts"],
        search: ["Explorar clubes", "/api/search/clubs", "clubs"],
        clubs: ["Mis clubes", "/api/clubs", "clubs"],
        memberships: ["Mis membresías", "/api/me/memberships", "memberships"],
        subscriptions: [
            "Mis suscripciones",
            "/api/me/subscriptions",
            "subscriptions",
        ],
        payments: ["Mis pagos", "/api/me/payments", "payments"],
        applications: ["Mis solicitudes y documentos", "/api/me/applications", "applications"],
    };
    const myPlans = useData(view === "clubs" ? "/api/me/subscriptions" : null);
    const [title, url, key] = config[view] || config.feed;
    const state = useData(url +
        "?" +
        new URLSearchParams({ page: String(page), limit: "10", q: search }), version);
    const [history, setHistory] = useState(false);
    const allRows: Row[] = (state.data?.[key] || []).map((r:Row)=>view==="subscriptions"?{...r,nextBillingAt:r.status==="ACTIVE"&&r.billingMode!=="ONE_TIME"&&r.plan?.type==="PAID"&&!r.cancelAtPeriodEnd?(r.nextBillingAt||r.expiresAt):null}:r);
    const rows: Row[] = view === "memberships" ? allRows.filter(r => r.status === "ACTIVE" && r.club.status === "ACTIVE") : view === "subscriptions" && !history ? allRows.filter(r => ["ACTIVE", "PENDING_PAYMENT"].includes(r.status)) : allRows;
    const nextCharge = allRows.filter(row => row.nextBillingAt)
        .sort((a, b) => Date.parse(a.nextBillingAt) - Date.parse(b.nextBillingAt))[0];
    async function checkout(row: Row) {
        if (paying)
            return;
        setPaying(true);
        setMessage("");
        try {
            const d = await api(`/api/clubs/${row.clubMembership.club.id}/subscriptions/${row.id}/checkout`, "POST");
            if (d.paymentId && d.checkoutSessionId)
                sessionStorage.setItem("checkout:" + d.checkoutSessionId, d.paymentId);
            if (d.paymentId)
                sessionStorage.setItem("lastPaymentId", d.paymentId);
            const url = safeUrl(d.checkoutUrl);
            if (!url)
                throw Error("El pago todavía no tiene un enlace disponible. Consulta Mis pagos.");
            window.location.assign(url);
        }
        catch (e) {
            setMessage((e as Error).message);
        }
        finally {
            setPaying(false);
        }
    }
    return (<>
      <PageHeading eyebrow="Tu espacio personal" title={title} description={{ clubs: "Un espacio para cada una de tus comunidades.", memberships: "Tu participación y tu historia en cada club.", subscriptions: "Tus planes, fechas de vigencia y renovaciones.", payments: "Revisa tus movimientos y el estado de cada pago.", applications: "Sigue tus solicitudes de ingreso y completa tus documentos." }[view] || "Todas tus novedades, en un solo lugar."}/>
      {view === "subscriptions" && <><div className="metrics-grid">{[["Suscripciones activas", allRows.filter(r => r.status === "ACTIVE" && r.billingMode !== "ONE_TIME").length], ["Pendiente", money(allRows.reduce((sum, r) => sum + (r.obligations || []).reduce((s: number, o: Row) => s + Number(o.amount), 0), 0))], ["Próximo cobro", nextCharge ? money(nextCharge.priceSnapshot ?? nextCharge.plan.price) : "—"]].map(([k, v]) => <dl className="metric-card" key={String(k)}><dt>{k}</dt><dd>{v}{k==="Próximo cobro" && nextCharge && <small>{new Date(nextCharge.nextBillingAt).toLocaleDateString("es-EC",{timeZone:"America/Guayaquil",dateStyle:"long"})}</small>}</dd></dl>)}</div><label className="history-toggle"><input type="checkbox" checked={history} onChange={e => setHistory(e.target.checked)}/> Mostrar historial de suscripciones y pases</label></>}
      {message && <p role="alert">{message}</p>}
      {view === "search" && (<form className="actions" onSubmit={(e) => {
                e.preventDefault();
                setSearch(term);
                setPage(1);
            }}>
          <label>
            Buscar clubes
            <input value={term} maxLength={100} onChange={(e) => setTerm(e.target.value)}/>
          </label>
          <button>Buscar</button>
        </form>)}
      {view === "clubs" && (<div className="section-actions"><EditorModal title="Crear un club">
          <CreateClub />
        </EditorModal></div>)}

      <Status state={state}>
        <Empty rows={rows}/>
        {view === "feed" && !rows.length && (<p>
            Las publicaciones aparecerán cuando pertenezcas a un club con
            actividad. <Link href={href("search")}>Explora clubes</Link>.
          </p>)}
        <div className={view === "clubs" ? "club-grid" : (view === "memberships" || view === "subscriptions") ? "bounded-cards" : "personal-grid"}>
        {rows.map((r: Row) => view === "memberships" ? <Link key={r.id} className="membership-medal" href={href("club", { club: r.club.id })}>{safeUrl(r.club.logoUrl) ? <AvatarImage src={safeUrl(r.club.logoUrl)} alt=""/> : <span className="medal-placeholder"><Icon name="users" size={48}/></span>}<h2>{r.club.name}</h2><strong>{label(r.role)}</strong><small>Desde {date(r.joinedAt)}</small></Link> : view === "clubs" ? <ClubCard key={r.id} club={{ ...r, planName: myPlans.data?.subscriptions.filter((s: Row) => s.clubMembership.club.id === r.id && s.status === "ACTIVE").map((s: Row) => s.plan.name).join(", ") }} destination={href("club", { club: r.id })}/> : (<Panel key={r.id} title={r.club?.name ||
                r.clubMembership?.club?.name ||
                r.name ||
                r.plan?.club?.name}>
            {r.title && <h3>{r.title}</h3>}
            {r.content && <p style={{ whiteSpace: "pre-wrap" }}>{r.content}</p>}
            {r.description && <p>{r.description}</p>}
            {safeUrl(r.imageUrl) && (<img src={safeUrl(r.imageUrl)} alt={r.title || "Publicación del club"}/>)}
            {r.author && (<small>
                {r.author.firstName} {r.author.lastName}
              </small>)}
            {r.plan && <p>Plan: {r.plan.name}</p>}{view==="applications"&&<><small>Solicitud {r.id.slice(0,8)} · {date(r.createdAt)}</small><p>{money(r.plan.price)} · {r.plan.billingMode==="ONE_TIME"?"Pago único":"Suscripción"}</p><p>{r.documents?.length||0} documentos cargados · {r.documents?.filter((d:Row)=>d.status==="APPROVED").length||0} validados</p></>}
            {view === "subscriptions" && r.plan && <p className="plan-price">{r.plan.type === "FREE" ? "Gratuito" : money(r.plan.price)} <small>/ {r.plan.durationValue} {label(r.plan.durationUnit)}</small></p>}
            {r.status && <p><Badge value={r.status}/></p>}
            {r.role && <p>Rol: {label(r.role)}</p>}
            {view !== "subscriptions" && r.createdAt && <p>{date(r.createdAt)}</p>}
            {r.joinedAt && <p>Ingreso: {date(r.joinedAt)}</p>}
            {r.billingMode === "ONE_TIME" && <p className="notice">Pase de pago único · {r.plan.durationValue} días</p>}
            {view === "subscriptions" && <p>{r.status === "ACTIVE" && r.billingMode === "RECURRING" && r.plan.type === "PAID" && !r.cancelAtPeriodEnd ? "Próximo cobro" : "Vencimiento"}: {r.status === "SUSPENDED" && !r.suspendedAt ? "Sin fecha registrada" : date(r.nextBillingAt || (r.status === "SUSPENDED" ? r.suspendedAt : r.expiresAt))}</p>}
            {r.amount !== undefined && <p>{money(r.amount, r.currency)}</p>}
            <div className="actions">
              {["clubs", "search"].includes(view) && (<Link href={href(view === "clubs" ? "club" : "publicClub", {
                    club: r.id,
                })}>
                  Ver club
                </Link>)}
              {view === "feed" && (<Link href={href("club", { club: r.club.id })}>Ir al club</Link>)}
              {view === "memberships" &&
                r.status === "ACTIVE" &&
                r.club.status === "ACTIVE" && (<Link href={href("club", { club: r.club.id })}>
                    Abrir club
                  </Link>)}
              {view === "payments" && (<Link href={href("payment", { id: r.id })}>Ver detalle</Link>)}
              {view === "subscriptions" &&
                r.status === "PENDING_PAYMENT" &&
                r.plan.type === "PAID" && (<button disabled={paying} onClick={() => void checkout(r)}>
                    Pagar suscripción
                  </button>)}
              {view === "subscriptions" &&
                r.status === "ACTIVE" &&
                r.plan.type === "PAID" && !r.cancelAtPeriodEnd && r.billingMode !== "ONE_TIME" && (<Action variant="destructive" url={`/api/clubs/${r.clubMembership.club.id}/subscriptions/${r.id}/cancel`} confirm="¿Programar la cancelación al finalizar el período actual?" onDone={() => refresh((v) => v + 1)}>
                    Cancelar renovación
                  </Action>)}
            </div>
            {view === "applications" && (<>
                <div className="step-progress">{["Documentos", "Revisión", "Ingreso"].map((step, i) => <span className={(r.status === "APPROVED" || i === 0 || i === 1 && r.status === "DOCUMENTATION_REVIEW") ? "done" : ""} key={step}>{i + 1}. {step}</span>)}</div>
                <p>{r.rejectionReason}</p>
                {["PENDING", "DOCUMENTATION_REVIEW"].includes(r.status)&&<><ApplicationDocuments application={r} onDone={()=>refresh(v=>v+1)}/><Action variant="destructive" url={`/api/clubs/${r.plan.clubId}/membership-applications/${r.id}`} method="PATCH" confirm="¿Cancelar esta solicitud?" onDone={()=>refresh(v=>v+1)}>Cancelar solicitud</Action></>}
                {r.status === "APPROVED" && (<Link className="btn btn-outline" href={href("subscriptions")}>
                    Consultar suscripción y pago
                  </Link>)}
              </>)}
          </Panel>))}
        </div>
        <Pager data={state.data} page={page} onPage={setPage}/>
      </Status>
    </>);
}
/** Comparte la ficha pública entre exploración y espacio privado y resuelve publicaciones enlazadas por identificador. */
export function PublicClub({club,target=""}:{club:string;target?:string}){
  const state=useData(`/api/catalog/clubs/${club}`);
  const [page,setPage]=useState<number|null>(null);
  const query=new URLSearchParams({limit:"10",page:String(page||1)});
  if(target && page===null)query.set("anchor",target);
  const posts=useData(`/api/clubs/${club}/posts?${query}`);
  useEffect(()=>{
    if(target && page===null && posts.data && state.data)
      document.getElementById("post-"+target)?.scrollIntoView({block:"start",behavior:"instant"});
  },[target,page,posts.data,state.data]);
  const plans:Row[]=state.data?.plans||[];
  return <>{!state.error && <ClubHero club={state.data?.club?.id===club ? state.data.club : undefined}/>}<div className="public-columns"><section><div className="list-heading"><h2>Publicaciones públicas</h2><small>Últimas novedades</small></div>
    <div><Status state={posts}><Empty rows={posts.data?.posts||[]}/>{posts.data?.posts.map((p:Row)=><PostCard key={p.id} post={p}/>)}
    {target && page===null && posts.data?.anchorMissing && <p>La publicación compartida ya no está disponible.</p>}
    <Pager data={posts.data} page={posts.data?.pagination.page||1} onPage={setPage}/>{!!posts.data?.posts.length&&!posts.data.pagination.hasNextPage&&<p className="feed-end">✓ Estás al día con las novedades del club</p>}</Status></div></section>
    <aside className="public-plans"><small>Tu próximo club empieza aquí</small><div><Status state={state}><PublicPlans club={club} plans={plans}/></Status></div></aside></div></>;
}
/** Solicita el detalle autorizado y presenta la confirmación y el importe del pago. */
export function Payment({ id }: {
    id: string;
}) {
    const state = useData(id ? `/api/payments/${encodeURIComponent(id)}` : null);
    const p = state.data?.payment;
    return (<>
      <PageHeading eyebrow="Mis pagos" title="Detalle de pago" description="Consulta el importe y la confirmación de tu transacción."/>
      <Link href={href("payments")}>Volver a mis pagos</Link>

      <Status state={state}>
        {p && (<div className="payment-detail-card"><Panel title={p.clubName}>
            <p>{p.plan.name}</p>
            <p className="plan-price">{money(p.amount, p.currency)}</p>
            <p><Badge value={p.status}/></p>
            <p>Fecha: {date(p.createdAt)}</p>
            <p>Pagado: {date(p.paidAt)}</p>
          </Panel></div>)}
      </Status>
    </>);
}

/** Relaciona cada requisito con su archivo vigente y envía la versión al solicitar su retirada. */
function ApplicationDocuments({application:r,onDone}:{application:Row;onDone:()=>void}){
 const [error,setError]=useState("");
 const base=`/api/clubs/${r.plan.clubId}/membership-applications/${r.id}`;
 const requirements:Row[]=r.plan.requiresDocumentation ? r.plan.documentRequirements||[] : [];
 const submit=<Action url={`${base}/submit`} onDone={onDone}>Enviar a revisión</Action>;
 if(!requirements.length)return submit;
 return <EditorModal title="Administrar documentos"><p>Adjunta los documentos solicitados. PDF · Máximo 8 MB por archivo.</p>{error&&<p role="alert">{error}</p>}{requirements.map(req=>{const doc=r.documents?.find((d:Row)=>d.requirementId===req.id&&!d.deletedAt);return <Panel key={req.id} title={req.name}><p>{req.description} · {req.isRequired?"Obligatorio":"Opcional"}</p>{doc&&<><p><Badge value={doc.status}/> {doc.rejectionReason}</p><small>{doc.fileName} · {doc.fileSizeBytes?Math.ceil(doc.fileSizeBytes/1024)+" KB":""}</small><div className="actions"><a className="btn btn-outline" href={safeUrl(doc.fileUrl)} target="_blank" rel="noreferrer">Ver documento</a>{doc.status!=="APPROVED"&&<Action url={`${base}/documents/${doc.id}?version=${doc.version}`} method="DELETE" confirm="¿Retirar este archivo?" onDone={onDone}>Retirar archivo</Action>}</div></>}{(!doc||["PENDING","REJECTED"].includes(doc.status))&&<UploadDropzone endpoint="membershipDocumentUploader" input={{clubId:r.plan.clubId,applicationId:r.id,requirementId:req.id}} content={{label:"Arrastra tu documento o haz clic para elegir",allowedContent:"PDF · Máximo 8 MB",button:"Subir documento"}} onClientUploadComplete={onDone} onUploadError={e=>setError(e.message)}/>}</Panel>})}{submit}</EditorModal>;
}
