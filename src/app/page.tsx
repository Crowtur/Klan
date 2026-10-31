import Link from "next/link";
import styles from "../components/basic.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>


      <main className={styles.main}>
        <section className={styles.hero}>
          <h1>Tu club, sus miembros y sus actividades en un solo lugar</h1>

          <p>
            Club SaaS es una plataforma web para organizar clubes y facilitar
            la participación de sus miembros. Reúne la gestión de membresías,
            reservas, publicaciones y pagos en un mismo espacio.
          </p>

          <p>
            Accede desde tu navegador y encuentra las herramientas que
            corresponden a tu participación en cada club.
          </p>

          <Link href="/register" className={styles.button}>
            Comienza ahora
          </Link>
        </section>

        <section aria-labelledby="features">
          <h2 id="features">¿Qué puedes hacer con la plataforma?</h2>

          <div className={styles.grid}>
            <article className={styles.card}>
              <h3>Participar en clubes</h3>
              <p>
                Consulta información de los clubes y gestiona tus solicitudes
                de membresía.
              </p>
            </article>

            <article className={styles.card}>
              <h3>Organizar tus actividades</h3>
              <p>
                Consulta los recursos disponibles y administra tus reservas.
              </p>
            </article>

            <article className={styles.card}>
              <h3>Gestionar membresías</h3>
              <p>
                Accede a la información de tus membresías, suscripciones y pagos.
              </p>
            </article>

            <article className={styles.card}>
              <h3>Administrar tu club</h3>
              <p>
                Los administradores pueden gestionar miembros, solicitudes,
                recursos y publicaciones según sus permisos.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="steps">
          <h2 id="steps">Así comienzas</h2>
          <p><strong>1.</strong> Crea tu cuenta con tu nombre y correo.</p>
          <p><strong>2.</strong> Inicia sesión para acceder a la plataforma.</p>
          <p>
            <strong>3.</strong> Participa en los clubes y utiliza las funciones
            habilitadas para tu cuenta.
          </p>

          <Link href="/register" className={styles.button}>
            Comienza ahora
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        Club SaaS · Plataforma de gestión de clubes
      </footer>
    </div>
  );
}