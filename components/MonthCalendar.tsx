"use client";

import { useMemo, useState } from "react";
import type { Entry } from "@/lib/types";

const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function MonthCalendar({
  entries,
  picked,
  onPick,
}: {
  entries: Entry[];
  picked: string | null;
  onPick: (date: string | null) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((entry) => {
      map.set(entry.entryDate, (map.get(entry.entryDate) ?? 0) + 1);
    });
    return map;
  }, [entries]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const monthKeys = Array.from({ length: daysInMonth }, (_, i) =>
    dayKey(new Date(year, month, i + 1)),
  );
  const writtenDays = monthKeys.filter((key) => counts.has(key)).length;

  function shift(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }

  return (
    <div className="cal">
      <div className="cal-head">
        <span className="cal-title">
          {year} 年 {month + 1} 月
        </span>
        <span className="cal-nav">
          <button type="button" onClick={() => shift(-1)} aria-label="上个月">
            ‹
          </button>
          <button type="button" onClick={() => shift(1)} aria-label="下个月">
            ›
          </button>
        </span>
      </div>

      <div className="cal-week">
        {WEEK_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((day, index) => {
          if (day === null) {
            return <span key={`blank-${index}`} className="cal-cell blank" />;
          }
          const key = dayKey(new Date(year, month, day));
          const count = counts.get(key) ?? 0;
          const classes = [
            "cal-cell",
            count > 0 ? "has" : "",
            key === dayKey(today) ? "today" : "",
            key === picked ? "picked" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              type="button"
              className={classes}
              onClick={() => onPick(picked === key ? null : count > 0 ? key : null)}
              title={count > 0 ? `${key} · ${count} 篇` : key}
              disabled={count === 0}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="cal-foot">本月写了 {writtenDays} 天</div>
    </div>
  );
}
