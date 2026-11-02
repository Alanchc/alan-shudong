"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import ThemeToggle from "@/components/ThemeToggle";
import { listEntries } from "@/lib/entries";
import { SITE_NAME } from "@/lib/site";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

export default function MePage() {
  const session = useSession();
  const [total, setTotal] = useState<number | null>(null);
  const [shared, setShared] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    listEntries()
      .then((list) => {
        setTotal(list.length);
        setShared(list.filter((entry) => entry.isPublic).length);
      })
      .catch(() => setTotal(null));
  }, [session]);

  return (
    <div className="me-page">
      <div className="me-inner">
        <div className="me-head">
          <span className="logo">树</span>
          <span className="brand-name">{SITE_NAME}</span>
          <Link href="/" className="link-btn" style={{ marginLeft: "auto", fontSize: 11 }}>
            返回首页
          </Link>
        </div>

        {session ? (
          <>
            <div className="me-card">
              <div className="me-label">当前账号</div>
              <div className="me-value">{session.user.email}</div>
            </div>

            <div className="me-stats">
              <div className="me-stat">
                <div className="me-stat-num">{total ?? "—"}</div>
                <div className="me-stat-label">篇日记</div>
              </div>
              <div className="me-stat">
                <div className="me-stat-num">{shared ?? "—"}</div>
                <div className="me-stat-label">篇已分享</div>
              </div>
            </div>

            <div className="me-row">
              <span>主题</span>
              <ThemeToggle />
            </div>

            <button
              type="button"
              className="me-row me-row-btn"
              onClick={() => supabase.auth.signOut()}
            >
              退出登录
            </button>
          </>
        ) : (
          <div className="me-card">
            <div className="me-label">还没有登录</div>
            <Link href="/login" className="primary-btn" style={{ marginTop: 12, display: "inline-flex" }}>
              去登录
            </Link>
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
