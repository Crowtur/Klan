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
import { NoticeCount } from "./notice-count";
import { PaymentHistory } from "./payment-history";
import { Icon } from "@/components/ui";
import { BrowseClubs } from "./explore";
import { Feed } from "./feed";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useData, Status, href, type Row } from "./common";
import { Personal, PublicClub, Payment } from "./personal";
import { Club, Posts } from "./club";
import { Facility } from "./facilities";
import {GlobalDashboard} from "./global-dashboard";
import { GlobalClubs, Settlement } from "./dashboard";
import "./workspace.css";
/** Lee la vista, el club y la pestaña desde la URL. Resuelve la sesión y la membresía antes de montar las herramientas del rol. */
export default function Workspace() {
    const q = useSearchParams(), view = q.get("view") || "feed", club = q.get("club") || "", id = q.get("id") || "", tab = q.get("tab") || "posts";
    const user = useData("/api/auth/me"), memberships = useData(`/api/me/memberships?context=${encodeURIComponent(club)}`);
    const member = memberships.data?.memberships.find((m: Row) => m.club.id === club && m.status === "ACTIVE" && m.club.status === "ACTIVE");
    const admin = member?.role === "CLUB_ADMIN" || user.data?.user.globalRole === "SUPER_ADMIN";
    const global = user.data?.user.globalRole === "SUPER_ADMIN";
    const context = ["club", "facility"].includes(view), globalView = ["admin", "globalClubs", "settlement", "globalPosts"].includes(view);
    return (<div className="workspace-shell">
      <nav className="workspace-nav" aria-label="Secciones"><div>
        {[["feed", "Inicio", "home"], ["search", "Explorar clubes", "compass"], ["clubs", "Mis clubes", "users"], ["applications", "Mis solicitudes", "document"], ...(global ? [["admin", "Administración global", "grid"], ["globalClubs", "Gestionar clubes", "settings"]] : [])].map(([v, t, i]) => <Link key={v} href={href(v)} aria-current={view === v ? "page" : undefined}><Icon name={i} size={18}/>{t}{(v === "clubs" || v === "applications") && <NoticeCount kind={v}/>}</Link>)}
      </div></nav>
      <main id="main-content" className="workspace">
      <Status state={user}>
        <Status state={memberships}>
          {context && !member && !global ? (<p className="notice">
              No tienes una membresía habilitada en este club.{" "}
              <Link href={href("publicClub", { club })}>
                Consultar información pública
              </Link>
              .
            </p>) : globalView && !global ? (<p className="error">
              No tienes acceso a la administración global.
            </p>) : (<div className="workspace-view" key={view + club + id}>
              {[
                "clubs",
                "memberships",
                "subscriptions",
                "applications",
            ].includes(view) && <Personal view={view} q={q.get("q") || ""}/>}
              {view === "payments" && <PaymentHistory />}
              {view === "feed" && <Feed user={user.data?.user} memberships={memberships.data?.memberships || []}/>}
              {view === "search" && <BrowseClubs authenticated initialQuery={q.get("q") || ""}/>}
              {view === "publicClub" && <PublicClub key={club+q.get("post")} club={club} target={q.get("post")||""}/>}
              {view === "club" && <Club club={club} tab={tab} admin={admin}/>}
              {view === "facility" && (<Facility club={club} id={id} admin={admin}/>)}
              {view === "payment" && <Payment id={id}/>}
              {view === "admin" && <GlobalDashboard />}
              {view === "globalClubs" && <GlobalClubs />}
              {view === "settlement" && <Settlement id={id}/>}
              {view === "globalPosts" && (<Posts club={club} admin canUpload={admin}/>)}
              {![
                "feed",
                "search",
                "clubs",
                "memberships",
                "subscriptions",
                "payments",
                "applications",
                "publicClub",
                "club",
                "facility",
                "payment",
                "admin",
                "globalClubs",
                "settlement",
                "globalPosts",
            ].includes(view) && (<p>
                  Sección no encontrada.{" "}
                  <Link href="/app">Volver al inicio</Link>
                </p>)}
            </div>)}
        </Status>
      </Status>
      </main>
    </div>);
}
