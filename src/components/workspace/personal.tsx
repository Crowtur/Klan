"use client";
import { Icon, PageHeading, PLACEHOLDER_IMAGE } from "@/components/ui";
import { ClubCard } from "./explore";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UploadButton } from "@/lib/uploadthing";
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
        applications: ["Mis solicitudes", "/api/me/applications", "applications"],
    };
    const [title, url, key] = config[view] || config.feed;
    const state = useData(url +
        "?" +
        new URLSearchParams({ page: String(page), limit: "10", q: search }), version);
    const rows: Row[] = state.data?.[key] || [];
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
      <PageHeading eyebrow="Tu espacio personal" title={title} description={{ clubs: "Un espacio para cada una de tus comunidades.", memberships: "Tu participación y tu historia en cada club.", subscriptions: "Tus planes, fechas de vigencia y renovaciones.", payments: "Revisa tus movimientos y el estado de cada pago. Importes en USD.", applications: "Sigue tus solicitudes de ingreso y completa tus documentos." }[view] || "Todas tus novedades, en un solo lugar."} action={<button className="secondary" onClick={() => refresh(v => v + 1)}><Icon name="refresh" size={17}/>Actualizar</button>}/>
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
      {view === "clubs" && (<details>
          <summary>Crear un club</summary>
          <Form fields={clubFields} url="/api/clubs" onDone={(d) => router.push(href("club", { club: d.club.id }))} submit="Crear club"/>
        </details>)}

      <Status state={state}>
        <Empty rows={rows}/>
        {view === "feed" && !rows.length && (<p>
            Las publicaciones aparecerán cuando pertenezcas a un club con
            actividad. <Link href={href("search")}>Explora clubes</Link>.
          </p>)}
        <div className={view === "clubs" ? "club-grid" : "personal-grid"}>
        {rows.map((r: Row) => view === "clubs" ? <ClubCard key={r.id} club={r} destination={href("club", { club: r.id })}/> : (<Panel key={r.id} title={r.club?.name ||
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
            {r.plan && <p>Plan: {r.plan.name}</p>}
            {view === "subscriptions" && r.plan && <p className="plan-price">{r.plan.type === "FREE" ? "Gratuito" : money(r.plan.price)} <small>/ {r.plan.durationValue} {label(r.plan.durationUnit)}</small></p>}
            {r.status && <p><Badge value={r.status}/></p>}
            {r.role && <p>Rol: {label(r.role)}</p>}
            {r.createdAt && <p>{date(r.createdAt)}</p>}
            {r.joinedAt && <p>Ingreso: {date(r.joinedAt)}</p>}
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
                r.plan.type === "PAID" && (<Action url={`/api/clubs/${r.clubMembership.club.id}/subscriptions/${r.id}/cancel`} confirm="¿Programar la cancelación al finalizar el período actual?" onDone={() => refresh((v) => v + 1)}>
                    Cancelar renovación
                  </Action>)}
            </div>
            {view === "applications" && (<>
                <p>{r.rejectionReason}</p>
                {["PENDING", "DOCUMENTATION_REVIEW"].includes(r.status) && (<>
                    <Action url={`/api/clubs/${r.plan.clubId}/membership-applications/${r.id}`} method="PATCH" confirm="¿Cancelar esta solicitud?" onDone={() => refresh((v) => v + 1)}>
                      Cancelar solicitud
                    </Action>
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
                                <a href={safeUrl(doc.fileUrl)} target="_blank" rel="noreferrer">
                                  Ver documento
                                </a>
                              </>)}
                            {(!doc || doc.status === "REJECTED") && (<UploadButton endpoint="membershipDocumentUploader" input={{
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
      <div className="public-club"><div className="club-banner"><img src={PLACEHOLDER_IMAGE} alt=""/></div><div className="club-identity"><span className="avatar">{safeUrl(state.data?.club.logoUrl) ? <img src={safeUrl(state.data?.club.logoUrl)} alt=""/> : <Icon name="users" size={30}/>}</span><div><p className="eyebrow">Encuentra tu comunidad</p><h1>{state.data?.club.name || "Club"}</h1><p>{state.data?.club.description}</p></div></div></div>
      <Status state={state}>
        <h2>Planes disponibles</h2>
        <Empty rows={state.data?.plans || []}/>
        <div className="grid">{state.data?.plans.map((p: Row) => (<Panel key={p.id} title={p.name}>
            <p>{p.description}</p>
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
      <button onClick={() => refresh((v) => v + 1)}>Actualizar estado</button>
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
