"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, date, type Row } from "./common";
export function Notifications() {
    const [data, setData] = useState<Row>({ notifications: [] }), [open, setOpen] = useState(false), [error, setError] = useState("");
    const router = useRouter();
    useEffect(() => { let live = true; const refresh = () => api("/api/me/notifications").then(d => { if (live)
        setData(d); }).catch(() => { }); void refresh(); const timer = setInterval(refresh, 30000); return () => { live = false; clearInterval(timer); }; }, []);
    return <div className="notification-box"><button aria-expanded={open} onClick={() => setOpen(!open)}>Notificaciones {data.unread > 0 && <b className="notification-count">{data.unread}</b>}</button>{open && <section className="notification-list" aria-label="Notificaciones"><h3>Tus novedades</h3>{error && <p role="alert">{error}</p>}{!data.notifications.length && <p>Estás al día.</p>}{data.notifications.map((n: Row) => <button key={n.id} className={n.readAt ? "secondary" : "unread"} onClick={async () => { try {
        await api("/api/me/notifications", "PATCH", { id: n.id });
        setData(await api("/api/me/notifications"));
        window.dispatchEvent(new Event("klubo-notifications"));
        setOpen(false);
        if (n.targetPath?.startsWith("/app"))
            router.push(n.targetPath);
    }
    catch (e) {
        setError((e as Error).message);
    } }}><strong>{n.title}</strong><small>{date(n.createdAt)}</small></button>)}</section>}</div>;
}
