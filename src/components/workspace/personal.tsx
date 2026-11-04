"use client";
import { CreateClub } from "./create-club";
import { EditorModal } from "./modal";
import { Icon, PageHeading, PLACEHOLDER_IMAGE } from "@/components/ui";
import { ClubCard } from "./explore";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UploadButton, UploadDropzone } from "@/lib/uploadthing";
import { Badge, api, useData, Panel, Status, Empty, Pager, Action, Form, href, label, date, money, safeUrl, clubFields, type Row, } from "./common";
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
    const allRows: Row[] = state.data?.[key] || [];
    const rows: Row[] = view === "memberships" ? allRows.filter(r => r.status === "ACTIVE" && r.club.status === "ACTIVE") : view === "subscriptions" && !history ? allRows.filter(r => ["ACTIVE", "PENDING_PAYMENT"].includes(r.status)) : allRows;
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
      {view === "subscriptions" && <><div className="metrics-grid">{[["Suscripciones activas", allRows.filter(r => r.status === "ACTIVE" && r.billingMode !== "ONE_TIME").length], ["Pendiente", money(allRows.reduce((sum, r) => sum + (r.obligations || []).reduce((s: number, o: Row) => s + Number(o.amount), 0), 0))], ["Próximo cobro", date(allRows.filter(r => r.nextBillingAt).sort((a, b) => Date.parse(a.nextBillingAt) - Date.parse(b.nextBillingAt))[0]?.nextBillingAt)]].map(([k, v]) => <dl className="metric-card" key={String(k)}><dt>{k}</dt><dd>{v}</dd></dl>)}</div><label><input type="checkbox" checked={history} onChange={e => setHistory(e.target.checked)}/> Mostrar historial de suscripciones y pases</label></>}
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
      {view === "clubs" && (<EditorModal title="Crear un club">
          <CreateClub />
        </EditorModal>)}

      <Status state={state}>
        <Empty rows={rows}/>
        {view === "feed" && !rows.length && (<p>
            Las publicaciones aparecerán cuando pertenezcas a un club con
            actividad. <Link href={href("search")}>Explora clubes</Link>.
          </p>)}
        <div className={view === "clubs" ? "club-grid" : "personal-grid"}>
        {rows.map((r: Row) => view === "memberships" ? <Link key={r.id} className="membership-medal" href={href("club", { club: r.club.id })}>{safeUrl(r.club.logoUrl) ? <img src={safeUrl(r.club.logoUrl)} alt=""/> : <Icon name="users" size={48}/>}<h2>{r.club.name}</h2><strong>{label(r.role)}</strong><small>Desde {date(r.joinedAt)}</small></Link> : view === "clubs" ? <ClubCard key={r.id} club={{ ...r, planName: myPlans.data?.subscriptions.filter((s: Row) => s.clubMembership.club.id === r.id && s.status === "ACTIVE").map((s: Row) => s.plan.name).join(", ") }} destination={href("club", { club: r.id })}/> : (<Panel key={r.id} title={r.club?.name ||
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
            {r.createdAt && <p>{date(r.createdAt)}</p>}
            {r.joinedAt && <p>Ingreso: {date(r.joinedAt)}</p>}
            {r.billingMode === "ONE_TIME" && <p className="notice">Pase de pago único · {r.plan.durationValue} días</p>}
            {r.nextBillingAt && <p>Próximo cobro: {date(r.nextBillingAt)} · {money(r.priceSnapshot ?? r.plan.price)}</p>}
            {r.expiresAt && <p>Vencimiento: {date(r.expiresAt)}</p>}
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
                r.plan.type === "PAID" && r.billingMode !== "ONE_TIME" && (<Action url={`/api/clubs/${r.clubMembership.club.id}/subscriptions/${r.id}/cancel`} confirm="¿Programar la cancelación al finalizar el período actual?" onDone={() => refresh((v) => v + 1)}>
                    Cancelar renovación
                  </Action>)}
            </div>
            {view === "applications" && (<>
                <div className="step-progress">{["Documentos", "Revisión", "Ingreso"].map((step, i) => <span className={(r.status === "APPROVED" || i === 0 || i === 1 && r.status === "DOCUMENTATION_REVIEW") ? "done" : ""} key={step}>{i + 1}. {step}</span>)}</div>
                <p>{r.rejectionReason}</p>
                {["PENDING", "DOCUMENTATION_REVIEW"].includes(r.status) && (<>
                    <Action url={`/api/clubs/${r.plan.clubId}/membership-applications/${r.id}/submit`} onDone={() => refresh(v => v + 1)}>Enviar a revisión</Action>
                    <Action url={`/api/clubs/${r.plan.clubId}/membership-applications/${r.id}`} method="PATCH" confirm="¿Cancelar esta solicitud?" onDone={() => refresh((v) => v + 1)}>
                      Cancelar solicitud
                    </Action>
                    <p className="muted">Documentos PDF. El área de carga muestra el tamaño máximo permitido.</p>
                    {r.plan.requiresDocumentation &&
                        r.plan.documentRequirements.map((req: Row) => {
                            const doc = r.documents.find((d: Row) => d.requirementId === req.id);
                            return (<Panel key={req.id} title={req.name}>
                            <p>
                              {req.description}{" "}
                              {req.isRequired ? "(Obligatorio)" : "(Opcional)"}
                            </p>
                            {doc && (<>
                                <p>
                                  {label(doc.status)} · {doc.rejectionReason}
                                </p>
                                <small>{doc.fileName} · {doc.fileSizeBytes ? Math.ceil(doc.fileSizeBytes / 1024) + " KB" : ""}</small><a className="btn btn-outline" href={safeUrl(doc.fileUrl)} target="_blank" rel="noreferrer">
                                  Ver documento
                                </a><Action method="DELETE" url={`/api/clubs/${r.plan.clubId}/membership-applications/${r.id}/documents/${doc.id}`} confirm="¿Retirar este documento?" onDone={() => refresh(v => v + 1)}>Retirar archivo</Action>
                              </>)}
                            {(!doc || doc.status === "REJECTED" || doc.status === "PENDING") && (<UploadDropzone endpoint="membershipDocumentUploader" input={{
                                        clubId: r.plan.clubId,
                                        applicationId: r.id,
                                        requirementId: req.id,
                                    }} onClientUploadComplete={() => refresh((v) => v + 1)} onUploadError={(e) => setMessage(e.message)}/>)}
                          </Panel>);
                        })}
                  </>)}
                {r.status === "APPROVED" && (<Link href={href("subscriptions")}>
                    Consultar suscripción y pago
                  </Link>)}
              </>)}
          </Panel>))}
        </div>
        <Pager data={state.data} page={page} onPage={setPage}/>
      </Status>
    </>);
}
export function PublicClub({ club }: {
    club: string;
}) {
    const state = useData(`/api/catalog/clubs/${club}`);
    const [version, refresh] = useState(0);
    const posts = useData(`/api/clubs/${club}/posts?page=${version + 1}&limit=10`);
    const router = useRouter();
    return (<>
      <div className="public-club"><div className="club-banner"><img src={safeUrl(state.data?.club.coverUrl) || "/brand/klubo-icon.png"} alt=""/></div><div className="club-identity"><span className="avatar">{safeUrl(state.data?.club.logoUrl) ? <img src={safeUrl(state.data?.club.logoUrl)} alt=""/> : <Icon name="users" size={30}/>}</span><div><p className="eyebrow">Encuentra tu comunidad</p><h1>{state.data?.club.name || "Club"}</h1><p>{state.data?.club.description}</p></div></div></div>
      <Status state={state}>
        <h2>Planes disponibles</h2>
        <Empty rows={state.data?.plans || []}/>
        <div className="grid">{state.data?.plans.map((p: Row) => (<Panel key={p.id} title={p.name}>
            <p>{p.description}</p>{Array.isArray(p.benefits) && <ul>{p.benefits.map((b: string) => <li key={b}>{b}</li>)}</ul>}
            <p className="plan-price">{p.type === "FREE" ? "Gratuito" : money(p.price)} <small>/ {p.durationValue} {label(p.durationUnit)}</small></p>
            {p.requiresDocumentation && (<p>
                Requiere documentos:{" "}
                {p.documentRequirements.map((r: Row) => r.name).join(", ")}
              </p>)}
            <Action url={`/api/clubs/${club}/membership-applications`} body={{ planId: p.id }} onDone={() => router.push(href("applications"))}>
              Solicitar ingreso
            </Action>
          </Panel>))}</div>
      </Status>
      <h2 style={{ marginTop: 36 }}>Publicaciones</h2>
      <Status state={posts}>
        <Empty rows={posts.data?.posts || []}/>
        {posts.data?.posts.map((p: Row) => (<Panel key={p.id} title={p.title || "Publicación"}>
            <p style={{ whiteSpace: "pre-wrap" }}>{p.content}</p>
            {safeUrl(p.imageUrl) && (<img src={safeUrl(p.imageUrl)} alt={p.title || "Publicación"}/>)}
            <small>{date(p.createdAt)}</small>
          </Panel>))}
        <Pager data={posts.data} page={version + 1} onPage={(p) => refresh(p - 1)}/>
      </Status>
    </>);
}
export function Payment({ id }: {
    id: string;
}) {
    const [version, refresh] = useState(0);
    const state = useData(id ? `/api/payments/${encodeURIComponent(id)}` : null, version);
    const p = state.data?.payment;
    return (<>
      <PageHeading eyebrow="Mis pagos" title="Detalle de pago" description="Consulta el importe y la confirmación de tu transacción."/>
      <Link href={href("payments")}>Volver a mis pagos</Link>

      <Status state={state}>
        {p && (<Panel title={p.clubName}>
            <p>{p.plan.name}</p>
            <p className="plan-price">{money(p.amount, p.currency)}</p>
            <p><Badge value={p.status}/></p>
            <p>Fecha: {date(p.createdAt)}</p>
            <p>Pagado: {date(p.paidAt)}</p>
          </Panel>)}
      </Status>
    </>);
}
