"use client";
import { useState } from "react";
import Link from "next/link";
import {
  useData,
  Panel,
  Status,
  Empty,
  Pager,
  safeUrl,
  type Row,
} from "./common";
import "./workspace.css";
export default function Explore() {
  const [text, setText] = useState(""),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1);
  const state = useData(
    "/api/search/clubs?" +
      new URLSearchParams({ q, page: String(page), limit: "10" }),
  );
  return (
    <main className="workspace">
      <h1>Explorar clubes</h1>
      <form
        className="actions"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(text);
          setPage(1);
        }}
      >
        <label>
          Nombre o descripción
          <input
            maxLength={100}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <button>Buscar</button>
      </form>
      <Status state={state}>
        <Empty rows={state.data?.clubs || []} />
        {state.data?.clubs.map((c: Row) => (
          <Panel key={c.id} title={c.name}>
            {safeUrl(c.logoUrl) && (
              <img src={safeUrl(c.logoUrl)} width={80} alt="" />
            )}
            <p>{c.description}</p>
            <Link href={`/explore/${c.id}`}>Conocer el club</Link>
          </Panel>
        ))}
        <Pager data={state.data} page={page} onPage={setPage} />
      </Status>
    </main>
  );
}
