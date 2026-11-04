"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EVENTS, onEvent } from "@/lib/events";
import { unreadAnnouncementsCount } from "@/lib/notices";
import { useSession } from "@/lib/useSession";

export default function NoticeBell({ className }: { className?: string }) {
  const session = useSession();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!session) {
      setCount(0);
      return;
    }

    let alive = true;
    const load = () => {
      unreadAnnouncementsCount()
        .then((value) => alive && setCount(value))
        .catch(() => {});
    };

    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    const offRead = onEvent(EVENTS.notices, load);

    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      offRead();
    };
  }, [session]);

  return (
    <Link
      href="/notices"
      className={`bell-btn${className ? ` ${className}` : ""}`}
      aria-label="通知"
      title="通知"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 3.6a5 5 0 015 5v3.4l1.4 2.7H5.6l1.4-2.7V8.6a5 5 0 015-5z" />
        <path d="M9.6 17.4a2.4 2.4 0 004.8 0" />
      </svg>
      {count > 0 && <span className="bell-badge">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
