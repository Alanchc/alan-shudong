import type { Mood } from "./types";

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export const MOOD_COLOR: Record<Mood, string> = {
  开心: "#3ba55d",
  平静: "#6d4aff",
  低落: "#c98a3b",
  疲惫: "#8a8a94",
  兴奋: "#d9527a",
};

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${y} 年 ${m} 月 ${d} 日 · ${weekday}`;
}

export function formatMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return `${y} 年 ${m} 月`;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function excerpt(md: string): string {
  return md
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*|__|\*|_|`/g, "")
    .replace(/^\s*[-·]\s*/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}
