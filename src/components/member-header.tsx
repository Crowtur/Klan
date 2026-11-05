"use client";
import { AvatarUpload } from "./avatar-upload";
import { Notifications } from "./workspace/notifications";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UploadButton } from "@/lib/uploadthing";
import { Brand, Icon } from "./ui";
import s from "./basic.module.css";
type User = {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
};
export default function MemberHeader() {
    const [user, setUser] = useState<User | null>(null), [open, setOpen] = useState(false), [photo, setPhoto] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const box = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null);
    const path = usePathname(), router = useRouter();
    async function refresh() {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (r.ok) {
            const d = await r.json();
            setUser(d.user);
        }
        else
            setUser(null);
    }
    useEffect(() => {
        let live = true;
        fetch("/api/auth/me", { cache: "no-store" })
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
      <Brand href={user ? "/app" : "/"}/>
      {user ? (<>

          <Suspense fallback={null}><Notifications /></Suspense><div ref={box} style={{ position: "relative" }}>
            <button ref={button} className={s.avatarButton} aria-label="Abrir perfil" aria-expanded={open} aria-controls="profile-panel" onClick={() => setOpen(!open)}>
              <span className="avatar">{user.avatarUrl ? (<img src={user.avatarUrl} alt="Tu foto" width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover" }}/>) : (user.firstName.slice(0, 1) + user.lastName.slice(0, 1))}</span><Icon name="chevron" size={16}/>
            </button>
            {open && (<section id="profile-panel" aria-label="Tu perfil" className={s.profilePanel}>
                <div className={s.profileInfo}><strong>
                  {user.firstName} {user.lastName}
                </strong>
                <p style={{ overflowWrap: "anywhere" }}>{user.email}</p></div>
                <AvatarUpload onDone={() => void refresh().catch(() => setError("Recarga para ver tu foto."))}/>
                <nav className={s.profileNav} aria-label="Opciones personales">
                  {[
                    ["memberships", "Mis membresías"],
                    ["subscriptions", "Mis suscripciones"],
                    ["payments", "Mis pagos"],
                    ["applications", "Mis solicitudes"],
                ].map(([v, label]) => (<Link key={v} href={"/app?view=" + v} onClick={() => setOpen(false)}>
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
        </>) : (<nav className={s.actions}>
          <Link href="/explore">Explorar clubes</Link>
          <Link className="btn btn-outline" href="/login">Iniciar sesión</Link>
          <Link className={s.button} href="/register">
            Registrarse
          </Link>
        </nav>)}
      </div>
    </header>);
}
