"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import styles from "./basic.module.css";

type Props = {
  mode: "login" | "register";
};

export default function AuthForm({ mode }: Props) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

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

    if (
      isRegister &&
      password !== String(form.get("confirmPassword") ?? "")
    ) {
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

      router.replace("/app");
      router.refresh();
    } catch {
      setError(
        "No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>


      <main className={styles.main}>
        <section className={`${styles.card} ${styles.formContainer}`}>
          <h1 style={{ fontSize: 28, fontWeight: "bold" }}>
            {isRegister ? "Crear una cuenta" : "Iniciar sesión"}
          </h1>

          {registered ? (
            <div role="status">
              <p className={styles.success}>
                Tu cuenta se creó correctamente. Ya puedes iniciar sesión.
              </p>

              <Link href="/login" className={styles.button}>
                Ir a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <p>
                {isRegister
                  ? "Completa tus datos para registrarte en Club SaaS."
                  : "Ingresa tu correo y contraseña para acceder."}
              </p>

              <form
                onSubmit={handleSubmit}
                className={styles.form}
                aria-busy={loading}
              >
                {isRegister && (
                  <>
                    <label className={styles.field}>
                      Nombre
                      <input
                        className={styles.input}
                        name="firstName"
                        autoComplete="given-name"
                        required
                        disabled={loading}
                      />
                    </label>

                    <label className={styles.field}>
                      Apellido
                      <input
                        className={styles.input}
                        name="lastName"
                        autoComplete="family-name"
                        required
                        disabled={loading}
                      />
                    </label>
                  </>
                )}

                <label className={styles.field}>
                  Correo electrónico
                  <input
                    className={styles.input}
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </label>

                <label className={styles.field}>
                  Contraseña
                  <input
                    className={styles.input}
                    name="password"
                    type="password"
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                    required
                    disabled={loading}
                  />
                </label>

                {isRegister && (
                  <label className={styles.field}>
                    Confirmar contraseña
                    <input
                      className={styles.input}
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      disabled={loading}
                    />
                  </label>
                )}

                {error && (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className={styles.button}
                  disabled={loading}
                >
                  {loading
                    ? "Procesando..."
                    : isRegister
                      ? "Registrarse"
                      : "Iniciar sesión"}
                </button>
              </form>

              <p>
                {isRegister ? "¿Ya tienes una cuenta? " : "¿No tienes cuenta? "}
                <Link
                  className={styles.link}
                  href={isRegister ? "/login" : "/register"}
                >
                  {isRegister ? "Inicia sesión" : "Regístrate"}
                </Link>
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}