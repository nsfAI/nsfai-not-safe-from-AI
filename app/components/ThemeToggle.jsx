"use client";

import { useEffect, useState } from "react";

function applyTheme(next) {
  const root = document.documentElement;
  if (next === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    const initial = stored || (prefersDark ? "dark" : "light");
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={theme === "dark"}
      className="rounded-xl border border-black/10 dark:border-white/20 bg-white dark:bg-[#141414] px-4 py-2 text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/10"
    >
      {theme === "dark" ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
