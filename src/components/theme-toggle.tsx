"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    try { setDark(localStorage.getItem("klubo-theme") === "dark"); } catch { /* storage can be unavailable */ }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    return () => { delete document.documentElement.dataset.theme; };
  }, [dark]);
  function toggle() {
    const next = !dark;
    setDark(next);
    try { localStorage.setItem("klubo-theme", next ? "dark" : "light"); } catch { /* keep the current session theme */ }
  }
  return <button type="button" className="theme-toggle" aria-label="Modo oscuro" aria-pressed={dark} onClick={toggle}>
    <svg className="theme-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></svg>
    <svg className="theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 14.3A9 9 0 0 1 9.7 3.2 9 9 0 1 0 20.8 14.3Z"/></svg>
  </button>;
}
