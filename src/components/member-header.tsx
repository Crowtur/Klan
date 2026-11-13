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
import { ThemeToggle } from "./theme-toggle";
import { AvatarUpload } from "./avatar-upload";
import { Notifications } from "./workspace/notifications";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UploadButton } from "@/lib/uploadthing";
import { Icon } from "./ui";
import s from "./basic.module.css";
type User = {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
};
/** Sincroniza el perfil de la cabecera con la sesión y controla la apertura, el foco y el cierre del menú personal. */
export default function MemberHeader() {
    const [user, setUser] = useState<User | null>(null), [open, setOpen] = useState(false), [photo, setPhoto] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const box = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null);
    const path = usePathname(), router = useRouter();
    async function refresh() {
        const r = await fetch("/api/auth/session", { cache: "no-store" });
        if (r.ok) {
            const d = await r.json();
            setUser(d.user);
        }
        else
            setUser(null);
    }
    useEffect(() => {
        let live = true;
        fetch("/api/auth/session", { cache: "no-store" })
            .then(async (r) => {
            const d = await r.json();
            if (live)
                setUser(r.ok ? d.user : null);
        })
            .catch(() => {
            if (live)
                setUser(null);
        });
        setOpen(false);
        return () => {
            live = false;
        };
    }, [path]);
    useEffect(() => {
        function close(e: PointerEvent) {
            if (box.current && !box.current.contains(e.target as Node))
                setOpen(false);
        }
        function key(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setOpen(false);
                button.current?.focus();
            }
        }
        document.addEventListener("pointerdown", close);
        document.addEventListener("keydown", key);
        return () => {
            document.removeEventListener("pointerdown", close);
            document.removeEventListener("keydown", key);
        };
    }, []);
    async function logout() {
        setBusy(true);
        setError("");
        try {
            const r = await fetch("/api/auth/logout", { method: "POST" });
            if (!r.ok)
                throw Error();
            setUser(null);
            setOpen(false);
            router.replace("/login");
            router.refresh();
        }
        catch {
            setError("No se pudo cerrar sesión. Intenta nuevamente.");
        }
        finally {
            setBusy(false);
        }
    }
    return (<header className={s.header}>
      <div className={s.headerInner}>
      {/* La cabecera global utiliza la marca tipográfica; el destino sigue dependiendo de la sesión. */}
      <Link className="brand" href={user ? "/app" : "/"}>Klan</Link>
      {user ? (<>

          {path!=="/" && <><ThemeToggle /><Suspense fallback={null}><Notifications /></Suspense></>}<div ref={box} style={{ position: "relative" }}>
            <button ref={button} className={s.avatarButton} aria-label="Abrir perfil" aria-expanded={open} aria-controls="profile-panel" onClick={() => setOpen(!open)}>
              <span className="avatar">{user.avatarUrl ? (<AvatarImage src={user.avatarUrl} alt="Tu foto" width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover" }}/>) : (user.firstName.slice(0, 1) + user.lastName.slice(0, 1))}</span><Icon name="chevron" size={16}/>
            </button>
            {open && (<section id="profile-panel" aria-label="Tu perfil" className={s.profilePanel}>
                <div className={s.profileInfo}><strong>
                  {user.firstName} {user.lastName}
                </strong>
                <p style={{ overflowWrap: "anywhere" }}>{user.email}</p></div>

                <nav className={s.profileNav} aria-label="Opciones personales">
                <AvatarUpload onDone={() => void refresh().catch(() => setError("Recarga para ver tu foto."))}/>
                  {[
                    ["memberships", "Mis membresías"],
                    ["subscriptions", "Mis suscripciones"],
                    ["payments", "Mis pagos"],
                    ["applications", "Mis solicitudes"],
                ].map(([v, label]) => (<Link className={s.photoButton} key={v} href={"/app?view=" + v} onClick={() => setOpen(false)}>
                      <Icon name={v === "memberships" ? "shield" : v === "subscriptions" ? "refresh" : v === "payments" ? "wallet" : "document"}/> {label}
                    </Link>))}
                </nav>
                <p>
                  <button disabled={busy} className={s.logout} onClick={logout}>
                    <Icon name="logout"/>{busy ? "Cerrando…" : "Cerrar sesión"}
                  </button>
                </p>
                {error && <p role="alert">{error}</p>}
              </section>)}
          </div>
        </>) : (<GuestNavigation/>)}
      </div>
    </header>);
}


/** Reutiliza los tres destinos del encabezado en portada, ingreso y registro. */
function GuestNavigation() {
    // Identifico el menú y su disparador para cerrarlo al salir o devolver el foco con Escape.
    const menu = useRef<HTMLDetailsElement>(null);
    useEffect(() => {
        const element = menu.current;
        if (!element) return;
        /** Un toque fuera del desplegable lo cierra sin interceptar la navegación. */
        function outside(event: PointerEvent) {
            if (event.target instanceof Node && !element?.contains(event.target)) element?.removeAttribute("open");
        }
        document.addEventListener("pointerdown", outside);
        return () => document.removeEventListener("pointerdown", outside);
    }, []);
    // Los estilos presentan una sola navegación por ancho; details funciona también antes de hidratar.
    const links = <nav className={s.actions}>
          <Link href="/explore">Explorar clubes</Link>
          <Link className="btn btn-outline" href="/login">Iniciar sesión</Link>
          <Link className={s.button} href="/register">
            Registrarse
          </Link>
        </nav>;
    return <><div className={s.guestDesktop}>{links}</div>
        <details className={s.guestMenu} ref={menu} onKeyDown={e => {
            // Escape cierra el panel y devuelve el foco al mismo botón que lo abrió.
            if (e.key === "Escape" && menu.current?.open) {
                menu.current.open = false;
                menu.current.querySelector("summary")?.focus();
            }
        }}>
            <summary aria-label="Menú de navegación"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg></summary>
            {/* Retirar el desplegable incluso cuando se vuelve a elegir la ruta actual. */}
            <div onClick={e => { if ((e.target as Element).closest("a") && menu.current) menu.current.open = false; }}>{links}</div>
        </details></>;
}
