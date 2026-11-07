"use client";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { date, href, Status, useData, type Row } from "./common";

export function ClubSidebar({club}: {club:string}) {
  const bookings = useData(`/api/clubs/${club}/my-reservations`);
  
  const confirmed:Row[] = (bookings.data?.reservations || []).filter((r:Row)=>r.status === "CONFIRMED");
  const next = confirmed.filter(r => Date.parse(r.startAt) >= Date.now())
    .sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt))[0];
  const last = [...confirmed].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];
  const facilities = useData(!bookings.loading && !last ? `/api/clubs/${club}/facilities?summary=popular` : null);
  const facility = last?.facility || facilities.data?.facilities?.[0];
  return <aside className="club-post-sidebar">
    <section className="panel"><Icon name="calendar"/><h3>Mi próxima reserva</h3>
      <Status state={bookings}>{next ? <><strong>{next.facility.name}</strong><p>{date(next.startAt)}</p>
        <Link href={href("club",{club,tab:"reservations"})}>Ver mis reservas</Link></> : <p>No tienes ninguna reserva.</p>}</Status>
    </section>
    <section className="panel"><Icon name="home"/><h3>Instalaciones</h3>
      <Status state={bookings.loading ? bookings : last ? bookings : facilities}>{facility ? <><strong>{facility.name}</strong><p>{facility.description || facility.location}</p>
        <Link href={href("facility",{club,id:facility.id})}>Consultar instalación</Link></> : <p>El club aún no tiene instalaciones.</p>}</Status>
    </section>
  </aside>;
}
