"use client";

import { useMemo } from "react";
import type { Entry } from "@/lib/types";

const WEEKDAY_LABELS = ["一", "", "三", "", "五", "", "日"];

function toKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function levelOf(count: number) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

type Cell = { key: string; count: number; level: number };

export default function Heatmap({ entries }: { entries: Entry[] }) {
  const { weeks, monthLabels, activeDays, total } = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      counts.set(entry.entryDate, (counts.get(entry.entryDate) ?? 0) + 1);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offset = (today.getDay() + 6) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - offset - 52 * 7);

    const weeks: (Cell | null)[][] = [];
    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    let total = 0;
    let activeDays = 0;

    for (let w = 0; w < 53; w += 1) {
      const monday = new Date(start);
      monday.setDate(start.getDate() + w * 7);

      if (monday.getMonth() !== lastMonth) {
        lastMonth = monday.getMonth();
        if (w > 0) monthLabels.push({ col: w, label: `${lastMonth + 1}月` });
      }

      const column: (Cell | null)[] = [];
      for (let d = 0; d < 7; d += 1) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + d);
        if (date > today) {
          column.push(null);
          continue;
        }
        const key = toKey(date);
        const count = counts.get(key) ?? 0;
        if (count > 0) {
          total += count;
          activeDays += 1;
        }
        column.push({ key, count, level: levelOf(count) });
      }
      weeks.push(column);
    }

    return { weeks, monthLabels, activeDays, total };
  }, [entries]);

  return (
    <div className="heat">
      <div className="heat-head">
        <span>过去一年</span>
        <span>
          {activeDays} 天 · {total} 篇
        </span>
      </div>

      <div className="heat-months">
        {monthLabels.map((item) => (
          <span key={item.col} style={{ gridColumnStart: item.col + 1 }}>
            {item.label}
          </span>
        ))}
      </div>

      <div className="heat-body">
        <div className="heat-weekdays">
          {WEEKDAY_LABELS.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
        <div className="heat-grid">
          {weeks.map((week, wi) =>
            week.map((cell, di) =>
              cell ? (
                <span
                  key={`${wi}-${di}`}
                  className={`heat-cell lv${cell.level}`}
                  title={`${cell.key} · ${cell.count > 0 ? `${cell.count} 篇` : "没有写"}`}
                />
              ) : (
                <span key={`${wi}-${di}`} className="heat-cell blank" />
              ),
            ),
          )}
        </div>
      </div>
    </div>
  );
}
