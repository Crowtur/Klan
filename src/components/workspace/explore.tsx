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
import { Location } from "./location";
import { NoticeCount } from "./notice-count";
import {useMobile} from "../use-mobile";
import { useState } from "react";
import Link from "next/link";
import { Icon, PageHeading, PLACEHOLDER_IMAGE } from "@/components/ui";
import { useData, Status, Pager, safeUrl, href, type Row } from "./common";
import "./workspace.css";
/** Presenta el club y dirige a la vista pública o privada que determine el contexto. */
export function ClubCard({ club, destination }: {
    club: Row;
    destination: string;
}) {
    return <article className={club.role ? "club-card joined-club" : "club-card"}><img className="club-cover" src={safeUrl(club.coverUrl) || PLACEHOLDER_IMAGE} alt="" loading="lazy"/><div className="club-card-body"><div className="row"><span className="avatar">{safeUrl(club.logoUrl) ? <AvatarImage src={safeUrl(club.logoUrl)} alt=""/> : <Icon name="users" size={25}/>}</span><h2>{club.name}</h2>{club.role && <NoticeCount club={club.id}/>}</div><p>{club.description || "Conoce este club y encuentra tu próxima comunidad."}</p><p className="club-meta"><Location value={club.address}/><span>{club.memberCount ?? club._count?.memberships ?? "—"} {(club.memberCount ?? club._count?.memberships) === 1 ? "miembro" : "miembros"}</span></p>{club.role === "CLUB_ADMIN" ? <small>Administrador</small> : club.planName && <small>{club.planName}</small>}<Link className="btn btn-outline" href={destination}>Ver club <Icon name="arrow" size={17}/></Link></div></article>;
}
/** Gestiona la búsqueda y la paginación del catálogo a partir de los filtros elegidos. */
export function BrowseClubs({ authenticated = false, initialQuery = "" }: {
    authenticated?: boolean;
    initialQuery?: string;
}) {
    // Acortar solo la sugerencia visible; la etiqueta accesible detalla ambos criterios.
    const mobile = useMobile();
    const [text, setText] = useState(initialQuery), [q, setQ] = useState(initialQuery), [page, setPage] = useState(1);
    const state = useData("/api/search/clubs?" + new URLSearchParams({ q, page: String(page), limit: "6" }));
    const memberships = useData(authenticated ? "/api/me/memberships" : null);
    const subscriptions = useData(authenticated ? "/api/me/subscriptions" : null);
    const clubs: Row[] = state.data?.clubs || [];
    return <><PageHeading eyebrow="Encuentra tu comunidad" title="Hay un club para cada pasión." description="Explora, conecta y encuentra tu próximo lugar favorito."/>
 <form className="search-bar" role="search" onSubmit={e => { e.preventDefault(); setQ(text.trim()); setPage(1); }}><label><Icon name="search"/><span className="sr-only">Buscar club por nombre o descripción</span><input type="search" maxLength={100} value={text} onChange={e => setText(e.target.value)} placeholder={mobile ? "Nombre o descripción…" : "Buscar club por nombre o descripción…"}/></label><button type="submit">Buscar</button>{q && <button type="button" className="secondary" onClick={() => { setText(""); setQ(""); setPage(1); }}>Limpiar</button>}</form>
 <div className="list-heading"><h2>Descubre nuestros clubes</h2>{state.data && <span>{state.data.pagination.total} clubes</span>}</div><Status state={state}>{!clubs.length && <div className="empty-state"><span className="icon-tile"><Icon name="search" size={28}/></span><h2>{q ? "No encontramos clubes con esa búsqueda" : "Pronto habrá nuevas comunidades"}</h2><p>{q ? "Prueba con otro nombre o una descripción más corta." : "Vuelve más adelante para explorar los clubes disponibles."}</p></div>}<div className="club-grid">{clubs.map(c => {
    const member = memberships.data?.memberships.find((m:Row) => m.club.id===c.id && m.status==="ACTIVE" && m.club.status==="ACTIVE");
    const planName = subscriptions.data?.subscriptions.filter((s:Row)=>s.clubMembership.club.id===c.id && s.status==="ACTIVE").map((s:Row)=>s.plan.name).join(", ");
    return <ClubCard key={c.id} club={{...c, role:member?.role, planName}} destination={authenticated ? href(member ? "club" : "publicClub",{club:c.id}) : `/explore/${c.id}`}/>;
 })}</div><Pager data={state.data} page={page} onPage={setPage}/></Status></>;
}
export default function Explore() { return <main id="main-content" className="workspace explore-page"><BrowseClubs /></main>; }
