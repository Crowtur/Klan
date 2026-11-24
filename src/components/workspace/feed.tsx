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
import {PostCard} from "./post-card";
import { useState } from "react";
import Link from "next/link";
import { Icon, PageHeading } from "@/components/ui";
import { useData, Status, Pager, href, date, safeUrl, type Row } from "./common";
/** Relaciona cada publicación con la membresía de su entidad para mostrar las acciones disponibles. */
export function Feed({ user, memberships }: {
    user?: Row;
    memberships: Row[];
}) {
    const [page, setPage] = useState(1), [version, setVersion] = useState(0);
    const state = useData(`/api/feed?page=${page}&limit=10`, version);
    const active = memberships.filter(m => m.status === "ACTIVE" && m.entity.status === "ACTIVE");
    return <div className="feed-layout"><div><PageHeading title="Tu comunidad, al día" description={`Hola${user?.firstName ? ", " + user.firstName : ""}. Esto es lo nuevo en tus entidades.`}/><Status state={state}>{!state.data?.posts?.length && <div className="empty-state"><span className="icon-tile"><Icon name="users" size={32}/></span><h2>Aún no tienes publicaciones</h2><p>Tu comunidad empieza con un primer encuentro. Explora entidades y únete para ver sus novedades aquí.</p><Link href={href("search")} className="btn">Explora entidades <Icon name="arrow"/></Link></div>}{state.data?.posts?.map((p: Row) => <PostCard key={p.id} post={p} admin={user?.globalRole==="SUPER_ADMIN" || active.some(m=>m.entity.id===p.entity.id && m.role==="ENTITY_ADMIN")} onChanged={()=>setVersion(v=>v+1)}/>)}<Pager data={state.data} page={page} onPage={setPage}/></Status></div><aside className="feed-sidebar"><section className="panel"><div className="list-heading"><h2>Mis entidades</h2><span className="badge">{active.length}</span></div>{active.slice(0, 4).map(m => <Link className="sidebar-entity" key={m.id} href={href("entity", { entity: m.entity.id })}><span className="avatar">{safeUrl(m.entity.logoUrl) ? <AvatarImage src={safeUrl(m.entity.logoUrl)} alt=""/> : <Icon name="users"/>}</span><span><strong>{m.entity.name}</strong><small>{m.joinedAt ? `Miembro desde ${new Date(m.joinedAt).toLocaleDateString("es-EC", { month: "long", year: "numeric", timeZone: "America/Guayaquil" })}` : "Tu comunidad"}</small></span></Link>)}{!active.length && <p className="muted">Tus entidades aparecerán aquí cuando tengas una membresía activa.</p>}<Link className="text-link" href={href("memberships")}>Ver mis membresías <Icon name="arrow" size={16}/></Link></section><section className="sidebar-promo"><Icon name="compass" size={26}/><h3>Hay una entidad para ti.</h3><p>Descubre nuevas aficiones y personas con quienes compartirlas.</p><Link className="text-link" href={href("search")}>Explorar entidades <Icon name="arrow" size={16}/></Link></section><section className="panel"><h3>Todo a mano</h3><p className="muted">Consulta tus solicitudes y mantente al día con tus pagos.</p><Link className="sidebar-shortcut" href={href("applications")}><Icon name="document"/>Mis solicitudes<Icon name="arrow" size={16}/></Link><Link className="sidebar-shortcut" href={href("payments")}><Icon name="wallet"/>Mis pagos<Icon name="arrow" size={16}/></Link></section></aside></div>;
}
