"use client";
import { useEffect, useState } from "react";
import { api, type Row } from "./common";
export function NoticeCount({ club, kind }: {
    club?: string;
    kind?: "applications" | "clubs" | "reservations";
}) {
    const [count, setCount] = useState(0);
    useEffect(() => { let live = true; const refresh = () => api("/api/me/notifications" + (club ? "?clubId=" + encodeURIComponent(club) : "")).then(d => { if (live)
        setCount((d.byClub || []).filter((r: Row) => !kind || kind === "clubs" || kind === "applications" && /APPLICATION|DOCUMENT/.test(r.type) || kind === "reservations" && /RESERVATION/.test(r.type)).reduce((n: number, r: Row) => n + Number(r._count), 0)); }).catch(() => { }); void refresh(); const timer = setInterval(refresh, 30000); window.addEventListener("klubo-notifications", refresh); return () => { live = false; clearInterval(timer); window.removeEventListener("klubo-notifications", refresh); }; }, [club, kind]);
    return count ? <span className="notification-count" aria-label={count + " novedades"}>{count}</span> : null;
}
