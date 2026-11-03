"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon, PageHeading, PLACEHOLDER_IMAGE } from "@/components/ui";
import { useData, Status, Pager, safeUrl, href, type Row } from "./common";
import "./workspace.css";
export function ClubCard({ club, destination }: {
    club: Row;
    destination: string;
}) {
    return <article className="club-card"><img className="club-cover" src={PLACEHOLDER_IMAGE} alt="" loading="lazy"/><div className="club-card-body"><div className="row"><span className="avatar">{safeUrl(club.logoUrl) ? <img src={safeUrl(club.logoUrl)} alt=""/> : <Icon name="users" size={25}/>}</span><h2>{club.name}</h2></div><p>{club.description || "Conoce este club y encuentra tu próxima comunidad."}</p><Link className="btn btn-outline" href={destination}>Ver club <Icon name="arrow" size={17}/></Link></div></article>;
}
export function BrowseClubs({ authenticated = false, initialQuery = "" }: {
    authenticated?: boolean;
    initialQuery?: string;
}) {
    const [text, setText] = useState(initialQuery), [q, setQ] = useState(initialQuery), [page, setPage] = useState(1);
    const state = useData("/api/search/clubs?" + new URLSearchParams({ q, page: String(page), limit: "6" }));
    const clubs: Row[] = state.data?.clubs || [];
    return <><PageHeading eyebrow="Encuentra tu comunidad" title="Hay un club para cada pasión." description="Explora, conecta y encuentra tu próximo lugar favorito."/>
 <form className="search-bar" role="search" onSubmit={e => { e.preventDefault(); setQ(text.trim()); setPage(1); }}><label><Icon name="search"/><span className="sr-only">Buscar club por nombre o descripción</span><input type="search" maxLength={100} value={text} onChange={e => setText(e.target.value)} placeholder="Buscar club por nombre o descripción…"/></label><button type="submit">Buscar</button>{q && <button type="button" className="secondary" onClick={() => { setText(""); setQ(""); setPage(1); }}>Limpiar</button>}</form>
 <div className="list-heading"><h2>Descubre nuestros clubes</h2>{state.data && <span>{state.data.pagination.total} clubes</span>}</div><Status state={state}>{!clubs.length && <div className="empty-state"><span className="icon-tile"><Icon name="search" size={28}/></span><h2>{q ? "No encontramos clubes con esa búsqueda" : "Pronto habrá nuevas comunidades"}</h2><p>{q ? "Prueba con otro nombre o una descripción más corta." : "Vuelve más adelante para explorar los clubes disponibles."}</p></div>}<div className="club-grid">{clubs.map(c => <ClubCard key={c.id} club={c} destination={authenticated ? href("publicClub", { club: c.id }) : `/explore/${c.id}`}/>)}</div><Pager data={state.data} page={page} onPage={setPage}/></Status></>;
}
export default function Explore() { return <main id="main-content" className="workspace explore-page"><BrowseClubs /></main>; }
