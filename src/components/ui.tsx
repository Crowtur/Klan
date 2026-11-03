import Link from "next/link";
import type { ReactNode } from "react";
export const PLACEHOLDER_IMAGE = "https://cdn.pixabay.com/photo/2020/09/02/14/07/dogs-5538401_1280.jpg";
const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></>,
    search: <><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></>,
    users: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-6 4h6v4h-6Z"/></>,
    settings: <><path d="M3 6h9m4 0h5M3 12h3m4 0h11M3 18h12m4 0h2"/><circle cx="14" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    chevron: <path d="m6 9 6 6 6-6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    document: <><path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h6"/></>,
    logout: <><path d="M9 3H4v18h5m6-14 5 5-5 5M8 12h12"/></>,
    refresh: <><path d="M20 7V3m0 4h-4M4 17v4m0-4h4"/><path d="M20 7a9 9 0 0 0-16 3m0 7a9 9 0 0 0 16-3"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/></>,
    camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/></>,
};
export function Icon({ name, size = 20 }: {
    name: string;
    size?: number;
}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.grid}</svg>; }
export function Brand({ href = "/" }: {
    href?: string;
}) { return <Link href={href} className="brand"><img src="/brand/klubo-icon.png" alt="" width="36" height="36"/><span>Klubo</span></Link>; }
export function Footer() { return <footer className="site-footer"><div><Brand /><p>Más tiempo para tu comunidad. Menos para la gestión.</p></div><small>© {new Date().getFullYear()} Klubo. Todos los derechos reservados.</small></footer>; }
export function PageHeading({ eyebrow, title, description, action, level = 1 }: {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: ReactNode;
    level?: 1 | 2;
}) { return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}{level === 1 ? <h1>{title}</h1> : <h2>{title}</h2>}{description && <p className="muted">{description}</p>}</div>{action}</div>; }
