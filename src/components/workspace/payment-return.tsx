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
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Payment } from "./personal";
import { href } from "./common";
import "./workspace.css";
/** Recupera el identificador de la transacción desde la URL o la sesión de Checkout para consultar su estado en Klan. */
export default function PaymentReturn({ cancelled = false, }: {
    cancelled?: boolean;
}) {
    const q = useSearchParams();
    const [id, setId] = useState("");
    useEffect(() => {
        const session = q.get("session_id");
        setId(q.get("payment_id") ||
            (session ? sessionStorage.getItem("checkout:" + session) : null) ||
            "");
    }, [q]);
    return (<main id="main-content" className="workspace">
      <h1>
        {cancelled
            ? "Regresaste sin completar el pago"
            : "Seguimiento del pago"}
      </h1>
      <p>
        {cancelled
            ? "Puedes volver a intentar el pago desde Mis suscripciones."
            : "El pago se confirma cuando recibimos la respuesta del procesador. El regreso a esta página no confirma por sí solo el cobro."}
      </p>
      <div className="actions">
        <Link className="btn" href={href("subscriptions")}>Mis suscripciones</Link>
        <Link className="btn btn-outline" href={href("payments")}>Mis pagos</Link>
      </div>
      {id ? (<Payment id={id}/>) : (<p>Consulta tu historial para comprobar el estado del pago.</p>)}
    </main>);
}
