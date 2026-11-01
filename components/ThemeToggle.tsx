"use client";

import { useEffect, useState } from "react";

type Mode = "auto" | "light" | "dark";

const OPTIONS: { value: Mode; label: string }[] = [
  { value: "auto", label: "系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("auto");

  useEffect(() => {
    const saved = localStorage.getItem("diary:theme");
    if (saved === "light" || saved === "dark") setMode(saved);
  }, []);

  function apply(next: Mode) {
    setMode(next);
    if (next === "auto") {
      delete document.documentElement.dataset.theme;
      localStorage.removeItem("diary:theme");
    } else {
      document.documentElement.dataset.theme = next;
      localStorage.setItem("diary:theme", next);
    }
  }

  return (
    <div className="theme-toggle" role="group" aria-label="主题">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={mode === option.value ? "on" : ""}
          onClick={() => apply(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
