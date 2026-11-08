const shapes:Record<string,string> = {
  building:"M3 21h18M5 21V8l7-5 7 5v13M9 10h1m4 0h1m-6 4h1m4 0h1m-4 7v-4h2v4",
  court:"M3 5h18v14H3z M12 5v14M3 9h18M3 15h18",
  dance:"M9 18V6l11-3v12 M9 16c-6-2-8 5-3 5 2 0 3-1 3-3m11-5c-6-2-8 5-3 5 2 0 3-1 3-3",
  theatre:"M3 4h18v16h-3M3 4c0 7 2 9 6 10l-4 6H3zM21 4c0 7-2 9-6 10l4 6M6 21h12",
  pool:"M5 14V5a2 2 0 0 1 4 0m4 9V5a2 2 0 0 1 4 0M5 8h8m-8 4h8M2 17q3 3 6 0 3 3 6 0 3 3 8 0M2 21q3 3 6 0 3 3 6 0 3 3 8 0",
  gym:"M2 10v4m3-8v12m3-10v8m0-4h8m0-4v8m3-10v12m3-8v4",
  library:"M3 5q5-2 9 1 4-3 9-1v14q-5-2-9 1-4-3-9-1zM12 6v14",
  cafe:"M3 6h13v5a6.5 6.5 0 0 1-13 0zM16 7h2a3 3 0 0 1 0 6h-2M2 21h18",
  garden:"M4 20q0-12 15-16 1 13-10 14M4 21l10-11",
  studio:"M4 4h16v16H4zM8 16l4-8 4 8z"
};
export function FacilityIcon({value}:{value?:string}){return <span className="facility-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={shapes[value||""]||shapes.building}/></svg></span>}
