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

// Refactorización Parte 11: vistas, parámetros y componentes del dominio Entity; textos visibles en español con concordancia femenina.

"use client";
import { EntityHero } from "./entity-hero";
import { NoticeCount } from "./notice-count";
import { PaymentHistory } from "./payment-history";
import { Icon } from "@/components/ui";
import { BrowseEntities } from "./explore";
import { Feed } from "./feed";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useData, Status, href, type Row } from "./common";
import { Personal, PublicEntity, Payment } from "./personal";
import { Entity, Posts } from "./entity";
import { Facility } from "./facilities";
import {GlobalDashboard} from "./global-dashboard";
import { GlobalEntities, Settlement } from "./dashboard";
import "./workspace.css";
/** Lee la vista, la entidad y la pestaña desde la URL. Resuelve la sesión y la membresía antes de montar las herramientas del rol. */
export default function Workspace({user}: {user: {id: string; firstName: string; globalRole: string}}) {
    const q = useSearchParams(), view = q.get("view") || "feed", entity = q.get("entity") || "", id = q.get("id") || "", tab = q.get("tab") || "posts";
    const memberships = useData(`/api/me/memberships?context=${encodeURIComponent(entity)}`);
    const member = memberships.data?.memberships.find((m: Row) => m.entity.id === entity && m.status === "ACTIVE" && m.entity.status === "ACTIVE");
    const admin = member?.role === "ENTITY_ADMIN" || user.globalRole === "SUPER_ADMIN";
    const global = user.globalRole === "SUPER_ADMIN";
    const context = ["entity", "facility"].includes(view), globalView = ["admin", "globalEntities", "settlement", "globalPosts"].includes(view);
    return (<div className="workspace-shell">
      <nav className="workspace-nav" aria-label="Secciones"><div>
        {[["feed", "Inicio", "home"], ["search", "Explorar entidades", "compass"], ["entities", "Mis entidades", "users"], ["applications", "Mis solicitudes", "document"], ...(global ? [["admin", "Administración global", "grid"], ["globalEntities", "Gestionar entidades", "settings"]] : [])].map(([v, t, i]) => <Link key={v} href={href(v)} aria-current={view === v ? "page" : undefined}><Icon name={i} size={18}/>{t}{(v === "entities" || v === "applications") && <NoticeCount kind={v}/>}</Link>)}
      </div></nav>
      <main id="main-content" className="workspace">
        {memberships.loading && (view==="entity" || view==="publicEntity") ? <EntityHero/> : <Status state={memberships}>
          {context && !member && !global ? (<p className="notice">
              No tienes una membresía habilitada en esta entidad.{" "}
              <Link href={href("publicEntity", { entity })}>
                Consultar información pública
              </Link>
              .
            </p>) : globalView && !global ? (<p className="error">
              No tienes acceso a la administración global.
            </p>) : (<div className="workspace-view" key={view + entity + id}>
              {[
                "entities",
                "memberships",
                "subscriptions",
                "applications",
            ].includes(view) && <Personal view={view} q={q.get("q") || ""}/>}
              {view === "payments" && <PaymentHistory />}
              {view === "feed" && <Feed user={user} memberships={memberships.data?.memberships || []}/>}
              {view === "search" && <BrowseEntities authenticated initialQuery={q.get("q") || ""}/>}
              {view === "publicEntity" && <PublicEntity key={entity+q.get("post")} entity={entity} target={q.get("post")||""}/>}
              {view === "entity" && <Entity entity={entity} tab={tab} admin={admin}/>}
              {view === "facility" && (<Facility entity={entity} id={id} admin={admin}/>)}
              {view === "payment" && <Payment id={id}/>}
              {view === "admin" && <GlobalDashboard />}
              {view === "globalEntities" && <GlobalEntities />}
              {view === "settlement" && <Settlement id={id}/>}
              {view === "globalPosts" && (<Posts entity={entity} admin canUpload={admin}/>)}
              {![
                "feed",
                "search",
                "entities",
                "memberships",
                "subscriptions",
                "payments",
                "applications",
                "publicEntity",
                "entity",
                "facility",
                "payment",
                "admin",
                "globalEntities",
                "settlement",
                "globalPosts",
            ].includes(view) && (<p>
                  Sección no encontrada.{" "}
                  <Link href="/app">Volver al inicio</Link>
                </p>)}
            </div>)}
        </Status>}
      </main>
    </div>);
}
