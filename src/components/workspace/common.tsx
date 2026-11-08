"use client";
import { useEffect, useState, useRef, type ReactNode, type FormEvent } from "react";
import {FacilityIcon} from "./facility-icon";
import { facilityIcons } from "@/lib/facility-icons";
import { Icon } from "@/components/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
// API records vary by module; only explicitly selected fields are shown in views.
export type Row = Record<string, any>;
export async function api(url: string, method = "GET", body?: unknown): Promise<Row> {
    const r = await fetch(url, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && typeof window !== "undefined")
        window.location.assign("/login");
    if (!r.ok || d.success === false) {
        const e = new Error(d.message || d.error || "No se pudo completar la operación.");
        Object.assign(e, { status: r.status });
        throw e;
    }
    return d;
}
export function useData(url: string | null, version = 0) {
    const [state, set] = useState<{
        data: Row | null;
        error: string;
        loading: boolean;
    }>({ data: null, error: "", loading: true });
    const router = useRouter();
    const previousUrl=useRef<string|null>(null);
    useEffect(() => {
        let live = true;
        const sameUrl=previousUrl.current===url;
        previousUrl.current=url;
        set(previous=>sameUrl&&previous.data?{...previous,error:"",loading:false}:{data:null,error:"",loading:true});
        if (!url) {
            set({ data: null, error: "", loading: false });
            return;
        }
        api(url)
            .then((data) => {
            if (live)
                set({ data, error: "", loading: false });
        })
            .catch((e) => {
            if (!live)
                return;
            if (e.status === 401)
                router.replace("/login");
            set({ data: null, error: e.message, loading: false });
        });
        return () => {
            live = false;
        };
    }, [url, version, router]);
    return state;
}
export function href(view: string, params: Record<string, string | number> = {}) {
    return ("/app?" +
        new URLSearchParams({
            view,
            ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
        }));
}
export const labels: Record<string, string> = {
    RESERVATION_EXPIRED: "Expirada", FINISHED: "Finalizada", DAY: "Días", ONE_TIME: "Pago único", RECURRING: "Recurrente",
    ACTIVE: "Activa",
    INACTIVE: "Inactiva",
    SUSPENDED: "Suspendida",
    REMOVED: "Retirada",
    PENDING: "Pendiente",
    DOCUMENTATION_REVIEW: "Revisión documental",
    PENDING_PAYMENT: "Pendiente de pago",
    APPROVED: "Aprobada",
    REJECTED: "Rechazada",
    CANCELLED: "Cancelada",
    EXPIRED: "Vencida",
    PAID: "Pagado",
    FAILED: "Fallido",
    PROCESSING: "En proceso",
    REFUNDED: "Reembolsado",
    CONFIRMED: "Confirmada",
    FREE: "Gratuito",
    MONTH: "Mes",
    YEAR: "Año",
    CLUB_ADMIN: "Administrador",
    MEMBER: "Miembro",
};
export function label(v: unknown) {
    return labels[String(v)] || String(v ?? "—");
}
export function date(v: unknown) {
    if (!v)
        return "—";
    const d = new Date(String(v));
    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleString("es-EC", { timeZone: "America/Guayaquil" });
}
export function money(v: unknown, _currency?: string) {
    return new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: "USD",
        currencyDisplay: "code",
    }).format(Number(v || 0));
}
export function safeUrl(v: unknown) {
    if(typeof v === "string" && /^\/api\/avatars\/[a-zA-Z0-9_-]+$/.test(v)) return v;
    try {
        const u = new URL(String(v));
        return ["https:", "http:"].includes(u.protocol) ? u.href : undefined;
    }
    catch {
        return undefined;
    }
}
export function Panel({ title, children, }: {
    title?: string;
    children: ReactNode;
}) {
    return (<section className="panel">
      {title && <h2>{title}</h2>}
      {children}
    </section>);
}
export function Status({ state, children, }: {
    state: ReturnType<typeof useData>;
    children: ReactNode;
}) {
    if (state.loading)
        return <div className="loading-state" role="status">Cargando información…</div>;
    if (state.error)
        return (<p className="error" role="alert">
        {state.error}
      </p>);
    return <>{children}</>;
}
export function Empty({ rows }: {
    rows: unknown[];
}) {
    return rows.length ? null : <div className="empty-state"><span className="icon-tile"><Icon name="document" size={28}/></span><h3>Todavía no hay registros</h3><p>Cuando haya información disponible, la encontrarás aquí.</p></div>;
}
export function Pager({ data, page, onPage, }: {
    data: Row | null;
    page: number;
    onPage: (n: number) => void;
}) {
    const p = data?.pagination;
    if (!p)
        return null;
    const totalPages = Math.max(1, p.totalPages || 1);
    const pages = Array.from(new Set([1, ...Array.from({ length: 3 }, (_, i) => page - 1 + i), totalPages])).filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    return <nav className="pager" aria-label="Paginación"><span className="pager-summary">{p.total !== undefined ? `${p.total} registros · ` : ""}Página {page} de {totalPages}</span><button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">‹</button>{pages.map((n, i) => <span key={n}>{i > 0 && n - pages[i - 1] > 1 && <span aria-hidden="true"> … </span>}<button aria-label={`Página ${n}`} aria-current={n === page ? "page" : undefined} onClick={() => onPage(n)}>{n}</button></span>)}<button disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Página siguiente">›</button></nav>;
}
export function Action({ children, url, method = "POST", body, confirm, onDone, }: {
    children: ReactNode;
    url: string;
    method?: string;
    body?: unknown;
    confirm?: string;
    onDone?: (d: Row) => void;
}) {
    const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [confirming, setConfirming] = useState(false);
    const dialog = useRef<HTMLDialogElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const destructive = /DELETE/.test(method) || /cancel|suspend|retir/i.test(url) || (typeof children === "string" && /cancel|suspend|elimin|desactiv/i.test(children));
    useEffect(() => {
        if (confirming)
            dialog.current?.showModal();
        else
            dialog.current?.close();
    }, [confirming]);
    const close = () => { setConfirming(false); trigger.current?.focus(); };
    async function run() {
        if (busy)
            return;
        close();
        setBusy(true);
        setMessage("");
        try {
            const d = await api(url, method, body);
            setMessage(d.message || "Operación completada.");
            onDone?.(d);
        }
        catch (e) {
            setMessage((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <span className="action"><button ref={trigger} className={destructive ? "danger" : undefined} disabled={busy} onClick={() => confirm ? setConfirming(true) : void run()}>{busy ? "Procesando…" : children}</button>{message && <span role="status">{message}</span>}{confirm && <dialog ref={dialog} className="confirm-dialog" aria-label="Confirmar operación" onCancel={close} onClose={() => setConfirming(false)}><h2>Confirma tu decisión</h2><p>{confirm}</p><div className="actions"><button className="secondary" onClick={close} autoFocus>Volver</button><button className={destructive ? "danger" : undefined} onClick={() => void run()}>Confirmar</button></div></dialog>}</span>;
}
export type Field = {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    options?: {
        value: string;
        label: string;
    }[];
    min?: number;
    max?: number;
    step?: string;
};
export function Form({ fields, url, method = "POST", initial = {}, onDone, submit = "Guardar", transform, }: {
    fields: Field[];
    url: string;
    method?: string;
    initial?: Row;
    onDone?: (d: Row) => void;
    submit?: string;
    transform?: (d: Row) => unknown;
}) {
    const [slug, setSlug] = useState(initial.slug || "");
    const [decision, setDecision] = useState(initial.status || "APPROVED");
    const [busy, setBusy] = useState(false), [error, setError] = useState("");
    async function send(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy(true);
        setError("");
        const form = e.currentTarget;
        const fd = new FormData(form);
        const body: Row = {};
        for (const f of fields) {
            const v = fd.get(f.name);
            body[f.name] =
                f.type === "checkbox"
                    ? v === "on"
                    : f.type === "number"
                        ? v === ""
                            ? null
                            : Number(v)
                        : String(v ?? "").trim();
        }
        if ("googleMapsUrl" in body && !body.googleMapsUrl) body.googleMapsUrl=null;
        if ("benefits" in body)
            body.benefits = body.benefits.split("\n").map((s: string) => s.trim()).filter(Boolean);
        try {
            const d = await api(url, method, transform ? transform(body) : body);
            setError(d.message || "Guardado correctamente.");
            onDone?.(d);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return (<form className="editor" onSubmit={send}>
      <fieldset disabled={busy}>
        {fields.filter(f => f.name !== "rejectionReason" || decision === "REJECTED").map((f) => f.name==="icon" ? <fieldset key={f.name} className="icon-picker"><legend>{f.label}</legend>{facilityIcons.map(icon=><label key={icon.value} title={icon.label}>
          <input type="radio" aria-label={icon.label} name="icon" value={icon.value} defaultChecked={icon.value===(initial.icon||"building")}/><FacilityIcon value={icon.value}/></label>)}</fieldset> : (<label key={f.name}>
            {f.label}
            {f.type === "textarea" ? (<textarea name={f.name} defaultValue={Array.isArray(initial[f.name]) ? initial[f.name].join("\n") : initial[f.name] ?? ""} required={f.required} maxLength={f.max}/>) : f.options ? (<select onChange={e => { if (f.name === "status")
                setDecision(e.target.value); }} name={f.name} defaultValue={String(initial[f.name] ?? f.options[0]?.value ?? "")} required={f.required}>
                {f.options.map((o) => (<option key={o.value} value={o.value}>
                    {o.label}
                  </option>))}
              </select>) : f.type === "checkbox" ? (<input type="checkbox" name={f.name} defaultChecked={Boolean(initial[f.name])}/>) : (<input onInput={e => { if (f.name === "slug") {
                const input = e.currentTarget;
                input.value = input.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                setSlug(input.value);
            } }} type={f.type || "text"} name={f.name} defaultValue={Array.isArray(initial[f.name]) ? initial[f.name].join("\n") : initial[f.name] ?? ""} required={f.required} min={f.min} max={f.max} step={f.step} maxLength={f.type !== "number" ? f.max : undefined}/>)}
            {f.name === "slug" && <small>Slug · {slug || "tu-club"}</small>}
          </label>))}
      </fieldset>
      <button disabled={busy}>{busy ? "Guardando…" : submit}</button>
      {error && <p role="status">{error}</p>}
    </form>);
}
export function NavLink({ view, params, children, }: {
    view: string;
    params?: Record<string, string | number>;
    children: ReactNode;
}) {
    return <Link href={href(view, params)}>{children}</Link>;
}
export const clubFields: Field[] = [
    { name: "name", label: "Nombre", required: true, max: 50 },
    {
        name: "slug",
        label: "Slug del club",
        required: true,
    },
    { name: "description", label: "Descripción", type: "textarea", max: 200 },
    { name: "address", label: "Dirección del club" }, { name: "googleMapsUrl", label: "Enlace de Google Maps", type: "url" },
];
export const facilityFields: Field[] = [
    {name:"icon",label:"Icono de la instalación",options:facilityIcons},
    { name: "name", label: "Nombre", required: true, max: 50 },
    { name: "description", label: "Descripción", type: "textarea" },
    { name: "location", label: "Ubicación" },
    { name: "capacity", label: "Capacidad", type: "number", min: 1 },
];
export const planFields: Field[] = [
    { name: "benefits", label: "Ingresa cada beneficio en una nueva línea (se mostrarán automáticamente con un check ✓ en la tarjeta)", type: "textarea" },
    { name: "name", label: "Nombre", required: true, max: 50 },
    { name: "description", label: "Descripción", type: "textarea" },
    {
        name: "type",
        label: "Tipo",
        options: [
            { value: "FREE", label: "Gratuito" },
            { value: "PAID", label: "De pago" },
        ],
    },
    {
        name: "price",
        label: "Precio (USD)",
        type: "number",
        required: true,
        min: 0,
        step: "0.01",
    },
    {
        name: "durationValue",
        label: "Duración",
        type: "number",
        min: 1,
        required: true,
    },
    {
        name: "durationUnit",
        label: "Unidad",
        options: [
            { value: "DAY", label: "Días · pago único" },
            { value: "MONTH", label: "Meses" },
            { value: "YEAR", label: "Años" },
        ],
    },
    {
        name: "requiresDocumentation",
        label: "Requiere documentación",
        type: "checkbox",
    },
];
export const requirementFields: Field[] = [
    { name: "name", label: "Documento requerido", required: true },
    { name: "description", label: "Instrucciones", type: "textarea" },
    { name: "isRequired", label: "Obligatorio", type: "checkbox" },
];
export const postFields: Field[] = [
    { name: "title", label: "Título", max: 150 },
    {
        name: "content",
        label: "Contenido",
        type: "textarea",
        required: true,
        max: 5000,
    },
];
export function Badge({ value }: {
    value: unknown;
}) { return <span className="badge" data-status={String(value)}>{label(value)}</span>; }
