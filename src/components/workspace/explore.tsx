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
/** Presenta la entidad y dirige a la vista pública o privada que determine el contexto. */
export function EntityCard({ entity, destination }: {
    entity: Row;
    destination: string;
}) {
    return <article className={entity.role ? "entity-card joined-entity" : "entity-card"}><img className="entity-cover" src={safeUrl(entity.coverUrl) || PLACEHOLDER_IMAGE} alt="" loading="lazy"/><div className="entity-card-body"><div className="row"><span className="avatar">{safeUrl(entity.logoUrl) ? <AvatarImage src={safeUrl(entity.logoUrl)} alt=""/> : <Icon name="users" size={25}/>}</span><h2>{entity.name}</h2>{entity.role && <NoticeCount entity={entity.id}/>}</div><p>{entity.description || "Conoce esta entidad y encuentra tu próxima comunidad."}</p><p className="entity-meta"><Location value={entity.address}/><span>{entity.memberCount ?? entity._count?.memberships ?? "—"} {(entity.memberCount ?? entity._count?.memberships) === 1 ? "miembro" : "miembros"}</span></p>{entity.role === "ENTITY_ADMIN" ? <small>Administrador</small> : entity.planName && <small>{entity.planName}</small>}<Link className="btn btn-outline" href={destination}>Ver entidad <Icon name="arrow" size={17}/></Link></div></article>;
}
/** Gestiona la búsqueda y la paginación del catálogo a partir de los filtros elegidos. */
export function BrowseEntities({ authenticated = false, initialQuery = "" }: {
    authenticated?: boolean;
    initialQuery?: string;
}) {
    // Acortar solo la sugerencia visible; la etiqueta accesible detalla ambos criterios.
    const mobile = useMobile();
    const [text, setText] = useState(initialQuery), [q, setQ] = useState(initialQuery), [page, setPage] = useState(1);
    const state = useData("/api/search/entities?" + new URLSearchParams({ q, page: String(page), limit: "6" }));
    const memberships = useData(authenticated ? "/api/me/memberships" : null);
    const subscriptions = useData(authenticated ? "/api/me/subscriptions" : null);
    const entities: Row[] = state.data?.entities || [];
    return <><PageHeading eyebrow="Encuentra tu comunidad" title="Hay una entidad para cada pasión." description="Explora, conecta y encuentra tu próximo lugar favorito."/>
 <form className="search-bar" role="search" onSubmit={e => { e.preventDefault(); setQ(text.trim()); setPage(1); }}><label><Icon name="search"/><span className="sr-only">Buscar entidad por nombre o descripción</span><input type="search" maxLength={100} value={text} onChange={e => setText(e.target.value)} placeholder={mobile ? "Nombre o descripción…" : "Buscar entidad por nombre o descripción…"}/></label><button type="submit">Buscar</button>{q && <button type="button" className="secondary" onClick={() => { setText(""); setQ(""); setPage(1); }}>Limpiar</button>}</form>
 <div className="list-heading"><h2>Descubre nuestras entidades</h2>{state.data && <span>{state.data.pagination.total} entidades</span>}</div><Status state={state}>{!entities.length && <div className="empty-state"><span className="icon-tile"><Icon name="search" size={28}/></span><h2>{q ? "No encontramos entidades con esa búsqueda" : "Pronto habrá nuevas comunidades"}</h2><p>{q ? "Prueba con otro nombre o una descripción más corta." : "Vuelve más adelante para explorar las entidades disponibles."}</p></div>}<div className="entity-grid">{entities.map(c => {
    const member = memberships.data?.memberships.find((m:Row) => m.entity.id===c.id && m.status==="ACTIVE" && m.entity.status==="ACTIVE");
    const planName = subscriptions.data?.subscriptions.filter((s:Row)=>s.entityMembership.entity.id===c.id && s.status==="ACTIVE").map((s:Row)=>s.plan.name).join(", ");
    return <EntityCard key={c.id} entity={{...c, role:member?.role, planName}} destination={authenticated ? href(member ? "entity" : "publicEntity",{entity:c.id}) : `/entity/${c.id}`}/>;
 })}</div><Pager data={state.data} page={page} onPage={setPage}/></Status></>;
}
export default function Explore() { return <main id="main-content" className="workspace explore-page"><BrowseEntities /></main>; }
