"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useData, Status, href, type Row } from "./common";
import { Personal, PublicClub, Payment } from "./personal";
import { Club, Posts } from "./club";
import { Facility } from "./facilities";
import { Dashboard, GlobalClubs, Settlement } from "./dashboard";
import "./workspace.css";
export default function Workspace() {
  const q = useSearchParams(),
    view = q.get("view") || "feed",
    club = q.get("club") || "",
    id = q.get("id") || "",
    tab = q.get("tab") || "posts";
  const user = useData("/api/auth/me"),
    memberships = useData(
      `/api/me/memberships?context=${encodeURIComponent(club)}`,
    );
  const member = memberships.data?.memberships.find(
    (m: Row) =>
      m.club.id === club && m.status === "ACTIVE" && m.club.status === "ACTIVE",
  );
  const admin = member?.role === "CLUB_ADMIN";
  const global = user.data?.user.globalRole === "SUPER_ADMIN";
  const context = ["club", "facility"].includes(view),
    globalView = ["admin", "globalClubs", "settlement", "globalPosts"].includes(
      view,
    );
  return (
    <div className="workspace">
      <nav className="tabs" aria-label="Secciones">
        <Link href={href("feed")}>Inicio</Link>
        <Link href={href("search")}>Explorar clubes</Link>
        <Link href={href("clubs")}>Mis clubes</Link>
        <Link href={href("applications")}>Mis solicitudes</Link>
        {global && (
          <>
            <Link href={href("admin")}>Administración global</Link>
            <Link href={href("globalClubs")}>Gestionar clubes</Link>
          </>
        )}
      </nav>
      <Status state={user}>
        <Status state={memberships}>
          {context && !member ? (
            <p className="notice">
              No tienes una membresía habilitada en este club.{" "}
              <Link href={href("publicClub", { club })}>
                Consultar información pública
              </Link>
              .
            </p>
          ) : globalView && !global ? (
            <p className="error">
              No tienes acceso a la administración global.
            </p>
          ) : (
            <div key={view + club + id + tab}>
              {[
                "feed",
                "search",
                "clubs",
                "memberships",
                "subscriptions",
                "payments",
                "applications",
              ].includes(view) && <Personal view={view} q={q.get("q") || ""} />}
              {view === "publicClub" && <PublicClub club={club} />}
              {view === "club" && <Club club={club} tab={tab} admin={admin} />}
              {view === "facility" && (
                <Facility club={club} id={id} admin={admin} />
              )}
              {view === "payment" && <Payment id={id} />}
              {view === "admin" && <Dashboard />}
              {view === "globalClubs" && <GlobalClubs />}
              {view === "settlement" && <Settlement id={id} />}
              {view === "globalPosts" && (
                <Posts club={club} admin canUpload={admin} />
              )}
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
              ].includes(view) && (
                <p>
                  Sección no encontrada.{" "}
                  <Link href="/app">Volver al inicio</Link>
                </p>
              )}
            </div>
          )}
        </Status>
      </Status>
    </div>
  );
}
