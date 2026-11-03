"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Payment } from "./personal";
import { href } from "./common";
import "./workspace.css";
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
