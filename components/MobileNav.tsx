"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { subscribeMessages, unreadCount } from "@/lib/chat";
import { EVENTS, onEvent } from "@/lib/events";
import { pendingRequestCount } from "@/lib/friends";
import { useSession } from "@/lib/useSession";

const ITEMS = [
  {
    href: "/",
    label: "首页",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    href: "/friends",
    label: "好友",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="9" cy="8" r="3.4" />
        <path d="M2.8 19a6.2 6.2 0 0112.4 0" />
        <path d="M16 5.4a3.4 3.4 0 010 6.4M17.5 13.4a6.2 6.2 0 013.7 5.6" />
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "消息",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 5.5h16v11h-9l-4.5 3.5v-3.5H4z" />
        <path d="M8 9.5h8M8 12.5h5" />
      </svg>
    ),
  },
  {
    href: "/diary",
    label: "日记",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h8M8 11h8M8 15h5" />
      </svg>
    ),
  },
  {
    href: "/feed",
    label: "动态",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v5l3 2" />
        <path d="M4.5 12h2M17.5 12h2" />
      </svg>
    ),
  },
  {
    href: "/me",
    label: "我的",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20a7.5 7.5 0 0115 0" />
      </svg>
    ),
  },
];

export default function MobileNav() {
  const pathname = usePathname();
  const session = useSession();
  const [counts, setCounts] = useState({ chat: 0, friends: 0 });

  useEffect(() => {
    if (!session) {
      setCounts({ chat: 0, friends: 0 });
      return;
    }

    let alive = true;
    const load = () => {
      Promise.all([unreadCount(), pendingRequestCount()])
        .then(([chat, friends]) => {
          if (alive) setCounts({ chat, friends });
        })
        .catch(() => {});
    };

    load();
    const off = subscribeMessages(() => load());
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    const offMessages = onEvent(EVENTS.messages, load);
    const offFriends = onEvent(EVENTS.friends, load);

    return () => {
      alive = false;
      off();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      offMessages();
      offFriends();
    };
  }, [session]);

  return (
    <nav className="mobile-nav">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href === "/diary" && pathname.startsWith("/diary/")) ||
          (item.href === "/feed" && pathname.startsWith("/feed/")) ||
          (item.href === "/chat" && pathname.startsWith("/chat/"));
        const badge =
          item.href === "/chat" ? counts.chat : item.href === "/friends" ? counts.friends : 0;
        return (
          <Link key={item.href} href={item.href} className={active ? "on" : undefined}>
            <span className="nav-icon">
              {item.icon}
              {badge > 0 && <span className="nav-badge">{badge > 99 ? "99+" : badge}</span>}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
