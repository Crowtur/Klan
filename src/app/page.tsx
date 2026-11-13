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

import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {userFromToken} from "@/lib/auth/auth";
import { ClubBubbles } from "@/components/club-bubbles";
import Link from "next/link";
import { Icon } from "@/components/ui";
const features = [
    ["users", "Clubes", "Toda la información de tu club y tu comunidad, siempre conectada.", "Un espacio para lo que te une"],
    ["calendar", "Instalaciones y reservas", "Organiza espacios y horarios. Reservar una instalación nunca fue tan fácil.", "Disponibilidad en tiempo real"],
    ["wallet", "Membresías y cobros", "Gestiona cuotas y membresías con claridad, sin perder ningún detalle.", "Tus cuentas bajo control"],
    ["settings", "Administración", "Centraliza tareas, permisos y solicitudes para que todo fluya.", "Menos trabajo, más tranquilidad"],
];
/** Redirige a los usuarios con sesión activa y muestra la portada pública a los visitantes. */
export default async function HomePage() {
    const token=(await cookies()).get("auth_token")?.value;
    if(await userFromToken(token))redirect("/app");
    return <main id="main-content">
 <section className="landing-hero"><div className="landing-inner"><div className="landing-copy"><p className="eyebrow">Tu club. Tu comunidad. Todo conectado.</p><h1>Gestiona tu club<br />en un solo lugar</h1><p>Reservas, membresías y cobros, sin complicaciones. Conecta con tus socios y dedica más tiempo a lo que los une.</p><div className="landing-actions"><Link href="/register" className="btn">Comienza ahora <Icon name="arrow"/></Link><a href="#como-funciona">Descubre cómo funciona ↓</a></div><div className="trust-row"><span><Icon name="check" size={16}/>Fácil de configurar</span><span><Icon name="check" size={16}/>Todo en un lugar</span></div></div><ClubBubbles/></div></section>
 <section className="landing-section"><div className="section-intro"><p className="eyebrow">Hecho para tu día a día</p><h2>Todo lo que tu club necesita</h2><p>Una plataforma sencilla. Muchas menos preocupaciones.</p></div><div className="feature-grid">{features.map(([i, t, d, n]) => <article className="feature-card" key={i}><span className="icon-tile"><Icon name={i}/></span><h3>{t}</h3><p>{d}</p><small>{n}</small></article>)}</div></section>
 <section className="steps-section" id="como-funciona"><div className="landing-section"><div className="section-intro"><p className="eyebrow">Así de fácil</p><h2>Tu club en marcha, en tres pasos</h2><p>De la primera idea a una comunidad mejor organizada.</p></div><div className="steps-grid">{[["Crea tu cuenta", "Regístrate y da el primer paso para simplificar tu día a día."], ["Configura tu club", "Añade tus instalaciones, cuotas y requisitos a tu ritmo."], ["Gestiona tu comunidad", "Revisa solicitudes, organiza reservas y comparte novedades."]].map(([t, d], i) => <article key={t} className="step"><span>{i + 1}</span><div><h3>{t}</h3><p>{d}</p></div></article>)}</div></div></section>
 <section className="landing-section"><div className="landing-cta"><img src="/brand/klan-icon.png" alt=""/><h2>Tu próximo gran paso empieza aquí.</h2><p>Haz espacio para lo importante. Nosotros te ayudamos con la gestión.</p><Link href="/register" className="btn btn-mint">Crea tu cuenta <Icon name="arrow"/></Link></div></section>
 </main>;
}
