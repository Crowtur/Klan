"use client";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// API records vary by module; only explicitly selected fields are shown in views.
export type Row = Record<string, any>;
export async function api(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<Row> {
  const r = await fetch(url, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && typeof window !== "undefined")
    window.location.assign("/login");
  if (!r.ok || d.success === false) {
    const e = new Error(
      d.message || d.error || "No se pudo completar la operación.",
    );
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
  useEffect(() => {
    let live = true;
    set({ data: null, error: "", loading: true });
    if (!url) {
      set({ data: null, error: "", loading: false });
      return;
    }
    api(url)
      .then((data) => {
        if (live) set({ data, error: "", loading: false });
      })
      .catch((e) => {
        if (!live) return;
        if (e.status === 401) router.replace("/login");
        set({ data: null, error: e.message, loading: false });
      });
    return () => {
      live = false;
    };
  }, [url, version, router]);
  return state;
}
export function href(
  view: string,
  params: Record<string, string | number> = {},
) {
  return (
    "/app?" +
    new URLSearchParams({
      view,
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ),
    })
  );
}
export const labels: Record<string, string> = {
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
  if (!v) return "—";
  const d = new Date(String(v));
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-EC", { timeZone: "America/Guayaquil" });
}
export function money(v: unknown, c = "USD") {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: c.toUpperCase(),
  }).format(Number(v || 0));
}
export function safeUrl(v: unknown) {
  try {
    const u = new URL(String(v));
    return ["https:", "http:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}
export function Panel({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
export function Status({
  state,
  children,
}: {
  state: ReturnType<typeof useData>;
  children: ReactNode;
}) {
  if (state.loading) return <p role="status">Cargando…</p>;
  if (state.error)
    return (
      <p className="error" role="alert">
        {state.error}
      </p>
    );
  return <>{children}</>;
}
export function Empty({ rows }: { rows: unknown[] }) {
  return rows.length ? null : <p>No hay registros para mostrar.</p>;
}
export function Pager({
  data,
  page,
  onPage,
}: {
  data: Row | null;
  page: number;
  onPage: (n: number) => void;
}) {
  const p = data?.pagination;
  if (!p) return null;
  return (
    <nav className="actions" aria-label="Paginación">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Anterior
      </button>
      <span>
        Página {page} de {Math.max(1, p.totalPages || 1)}
      </span>
      <button
        disabled={page >= (p.totalPages || 1)}
        onClick={() => onPage(page + 1)}
      >
        Siguiente
      </button>
    </nav>
  );
}
export function Action({
  children,
  url,
  method = "POST",
  body,
  confirm,
  onDone,
}: {
  children: ReactNode;
  url: string;
  method?: string;
  body?: unknown;
  confirm?: string;
  onDone?: (d: Row) => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <span className="action">
      <button
        disabled={busy}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setMessage("");
          try {
            const d = await api(url, method, body);
            setMessage(d.message || "Operación completada.");
            onDone?.(d);
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Procesando…" : children}
      </button>
      {message && <span role="status">{message}</span>}
    </span>
  );
}
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: string;
};
export function Form({
  fields,
  url,
  method = "POST",
  initial = {},
  onDone,
  submit = "Guardar",
  transform,
}: {
  fields: Field[];
  url: string;
  method?: string;
  initial?: Row;
  onDone?: (d: Row) => void;
  submit?: string;
  transform?: (d: Row) => unknown;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
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
    try {
      const d = await api(url, method, transform ? transform(body) : body);
      setError(d.message || "Guardado correctamente.");
      onDone?.(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="editor" onSubmit={send}>
      <fieldset disabled={busy}>
        {fields.map((f) => (
          <label key={f.name}>
            {f.label}
            {f.type === "textarea" ? (
              <textarea
                name={f.name}
                defaultValue={initial[f.name] ?? ""}
                required={f.required}
                maxLength={f.max}
              />
            ) : f.options ? (
              <select
                name={f.name}
                defaultValue={String(
                  initial[f.name] ?? f.options[0]?.value ?? "",
                )}
                required={f.required}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "checkbox" ? (
              <input
                type="checkbox"
                name={f.name}
                defaultChecked={Boolean(initial[f.name])}
              />
            ) : (
              <input
                type={f.type || "text"}
                name={f.name}
                defaultValue={initial[f.name] ?? ""}
                required={f.required}
                min={f.min}
                max={f.max}
                step={f.step}
                maxLength={f.type !== "number" ? f.max : undefined}
              />
            )}
          </label>
        ))}
      </fieldset>
      <button disabled={busy}>{busy ? "Guardando…" : submit}</button>
      {error && <p role="status">{error}</p>}
    </form>
  );
}
export function NavLink({
  view,
  params,
  children,
}: {
  view: string;
  params?: Record<string, string | number>;
  children: ReactNode;
}) {
  return <Link href={href(view, params)}>{children}</Link>;
}
export const clubFields: Field[] = [
  { name: "name", label: "Nombre", required: true },
  {
    name: "slug",
    label: "Nombre en la dirección (sin espacios)",
    required: true,
  },
  { name: "description", label: "Descripción", type: "textarea" },
];
export const facilityFields: Field[] = [
  { name: "name", label: "Nombre", required: true },
  { name: "description", label: "Descripción", type: "textarea" },
  { name: "location", label: "Ubicación" },
  { name: "capacity", label: "Capacidad", type: "number", min: 1 },
];
export const planFields: Field[] = [
  { name: "name", label: "Nombre", required: true },
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
