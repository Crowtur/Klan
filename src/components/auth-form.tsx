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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "./ui";
import styles from "./basic.module.css";
type Props = {
    mode: "login" | "register";
};
/** Comparte campos y validación entre registro e ingreso y actualiza la navegación tras una respuesta válida. */
export default function AuthForm({ mode }: Props) {
    const router = useRouter();
    const isRegister = mode === "register";
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [registered, setRegistered] = useState(false);
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading)
            return;
        setError("");
        const form = new FormData(event.currentTarget);
        const email = String(form.get("email") ?? "").trim();
        const password = String(form.get("password") ?? "");
        const firstName = String(form.get("firstName") ?? "").trim();
        const lastName = String(form.get("lastName") ?? "").trim();
        if (isRegister && (!firstName || !lastName)) {
            setError("Escribe tu nombre y apellido.");
            return;
        }
        if (isRegister &&
            password !== String(form.get("confirmPassword") ?? "")) {
            setError("Las contraseñas no coinciden.");
            return;
        }
        const body = isRegister
            ? { firstName, lastName, email, password }
            : { email, password };
        setLoading(true);
        try {
            const response = await fetch(`/api/auth/${mode}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(body),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || data?.success !== true) {
                setError(data?.message || "No se pudo completar la solicitud.");
                return;
            }
            if (isRegister) {
                setRegistered(true);
                return;
            }
            try { sessionStorage.removeItem("klubo:admin-filters"); } catch {}
            router.replace("/app");
            router.refresh();
        }
        catch {
            setError("No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.");
        }
        finally {
            setLoading(false);
        }
    }
    return (<div className={styles.page}>


      <main id="main-content" className="auth-layout">
        <aside className="auth-story"><span className="icon-tile"><Icon name="users" size={32}/></span><h2>Tu comunidad empieza aquí.</h2><p>Un espacio para conectar con tus clubes, organizar tus reservas y disfrutar de lo que te une.</p><small>Klubo · Más tiempo para lo importante.</small></aside>
        <section className={`${styles.card} ${styles.formContainer}`}>
          <h1 style={{ fontSize: 28, fontWeight: "bold" }}>
            {isRegister ? "Crear una cuenta" : "Iniciar sesión"}
          </h1>

          {registered ? (<div role="status">
              <p className={styles.success}>
                Tu cuenta se creó correctamente. Ya puedes iniciar sesión.
              </p>

              <Link href="/login" className={styles.button}>
                Ir a iniciar sesión
              </Link>
            </div>) : (<>
              <p>
                {isRegister
                ? "Completa tus datos para registrarte en Klubo."
                : "Ingresa tu correo y contraseña para acceder."}
              </p>

              <form onSubmit={handleSubmit} className={styles.form} aria-busy={loading}>
                {isRegister && (<>
                    <label className={styles.field}>
                      Nombre
                      <input className={styles.input} name="firstName" autoComplete="given-name" required disabled={loading}/>
                    </label>

                    <label className={styles.field}>
                      Apellido
                      <input className={styles.input} name="lastName" autoComplete="family-name" required disabled={loading}/>
                    </label>
                  </>)}

                <label className={styles.field}>
                  Correo electrónico
                  <input className={styles.input} name="email" type="email" autoComplete="email" required disabled={loading}/>
                </label>

                <label className={styles.field}>
                  Contraseña
                  <input className={styles.input} name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} required disabled={loading}/>
                </label>

                {isRegister && (<label className={styles.field}>
                    Confirmar contraseña
                    <input className={styles.input} name="confirmPassword" type="password" autoComplete="new-password" required disabled={loading}/>
                  </label>)}

                {error && (<p className={styles.error} role="alert">
                    {error}
                  </p>)}

                <button type="submit" className={styles.button} disabled={loading}>
                  {loading
                ? "Procesando..."
                : isRegister
                    ? "Registrarse"
                    : "Iniciar sesión"}
                </button>
              </form>

              <p>
                {isRegister ? "¿Ya tienes una cuenta? " : "¿No tienes cuenta? "}
                <Link className={styles.link} href={isRegister ? "/login" : "/register"}>
                  {isRegister ? "Inicia sesión" : "Regístrate"}
                </Link>
              </p>
            </>)}
        </section>
      </main>
    </div>);
}
