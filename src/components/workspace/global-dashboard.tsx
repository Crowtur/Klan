"use client";
import {useSearchParams} from "next/navigation";
import {useEffect} from "react";
import {Dashboard} from "./dashboard";

const key = "klubo:admin-filters";
type Filters = {section:string;period:string};

function valid(section:string|null, period:string|null): Filters|null {
  if (section !== "resumen" && section !== "finanzas-liquidacion") return null;
  if (!period || !/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(period)) return null;
  return {section:section === "resumen" ? "overview" : "finances", period};
}
function storeFilters(filters:Filters) {
  try {sessionStorage.setItem(key,JSON.stringify(filters));} catch {}
}
function navigate(filters:Filters) {
  const url = new URL(window.location.href);
  url.searchParams.set("seccion",filters.section === "finances" ? "finanzas-liquidacion" : "resumen");
  url.searchParams.set("periodo",filters.period);
  storeFilters(filters);
  window.history.replaceState(null,"",url);
}

export function GlobalDashboard() {
  const query = useSearchParams();
  const section = query.get("seccion"), period = query.get("periodo");
  useEffect(()=>{
    const fromUrl = valid(section,period);
    if (fromUrl) {storeFilters(fromUrl);return;}
    const fallback = {section:"overview",period:new Date().toLocaleDateString("en-CA",{timeZone:"America/Guayaquil"}).slice(0,7)};
    try {
      const cached = JSON.parse(sessionStorage.getItem(key) || "null");
      if (cached && ["overview","finances"].includes(cached.section) && valid("resumen",cached.period)) {
        navigate(cached);return;
      }
    } catch {}
    navigate(fallback);
  },[section,period]);
  const filters = valid(section,period);
  return filters ? <Dashboard filters={filters} onFilters={navigate}/> : null;
}
