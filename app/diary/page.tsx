"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Heatmap from "@/components/Heatmap";
import MobileNav from "@/components/MobileNav";
import ThemeToggle from "@/components/ThemeToggle";
import { deleteEntry, listEntries, setShare } from "@/lib/entries";
import { excerpt, formatDate, formatMonth, formatTime, MOOD_COLOR } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";
import { supabase } from "@/lib/supabase";
import type { Entry } from "@/lib/types";
import { useIsMobile } from "@/lib/useIsMobile";
import { useSession } from "@/lib/useSession";

export default function Home() {
  const session = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listEntries();
      setEntries(list);
      setSelectedId((prev) => prev ?? list[0]?.id ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      reload();
    } else if (session === null) {
      setLoading(false);
      setEntries([]);
    }
  }, [session, reload]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((entry) => entry.tags.forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [entries]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return entries
      .filter((entry) => (activeTag ? entry.tags.includes(activeTag) : true))
      .filter((entry) =>
        keyword
          ? (entry.title + entry.contentMd).toLowerCase().includes(keyword)
          : true,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [entries, query, activeTag]);

  const groups = useMemo(() => {
    const result: { month: string; items: Entry[] }[] = [];
    filtered.forEach((entry) => {
      const month = formatMonth(entry.entryDate);
      const last = result[result.length - 1];
      if (last && last.month === month) last.items.push(entry);
      else result.push({ month, items: [entry] });
    });
    return result;
  }, [filtered]);

  const selected =
    entries.find((entry) => entry.id === selectedId) ?? filtered[0] ?? null;

  async function handleDelete(id: string) {
    if (!window.confirm("删除后无法恢复，确定删除这篇日记吗？")) return;
    try {
      await deleteEntry(id);
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function handleShare(entry: Entry) {
    try {
      const updated = await setShare(entry.id, !entry.isPublic);
      setEntries((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分享设置失败");
    }
  }

  async function copyLink(slug: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("复制失败，请手动复制链接");
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-head">
          <Link href="/" className="logo" aria-label="返回首页">
            树
          </Link>
          <span className="brand-name">{SITE_NAME}</span>
          <Link href="/diary/write" className="new-btn">
            ＋ 新建
          </Link>
        </div>

        {!loading && entries.length > 0 && <Heatmap entries={entries} />}

        <div className="search-box">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题或内容"
            aria-label="搜索"
          />
        </div>

        <div className="chips">
          <button
            type="button"
            className={activeTag === null ? "chip active" : "chip"}
            onClick={() => setActiveTag(null)}
          >
            全部
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={activeTag === tag ? "chip active" : "chip"}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="list-scroll">
          {loading && (
            <div className="skeleton-list">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          )}

          {groups.map((group) => (
            <div key={group.month}>
              <div className="group-label">{group.month}</div>
              {group.items.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={entry.id === selected?.id ? "list-item active" : "list-item"}
                  onClick={() =>
                    isMobile ? router.push(`/diary/entry/${entry.id}`) : setSelectedId(entry.id)
                  }
                >
                  <div className="item-top">
                    <span>
                      {entry.entryDate.slice(5)} · {formatTime(entry.createdAt)}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <i className="mood-dot" style={{ background: MOOD_COLOR[entry.mood] }} />
                      {entry.mood}
                    </span>
                  </div>
                  <div className="item-title">{entry.title || "无标题"}</div>
                  <div className="item-excerpt">{excerpt(entry.contentMd)}</div>
                </button>
              ))}
            </div>
          ))}
          {!loading && session && entries.length === 0 && (
            <div className="group-label" style={{ padding: "20px 6px" }}>
              还没有日记，点「新建」写下第一篇
            </div>
          )}
          {!loading && entries.length > 0 && filtered.length === 0 && (
            <div className="group-label" style={{ padding: "20px 6px" }}>
              没有匹配的日记，换个关键词或标签试试
            </div>
          )}
        </div>

        <div className="sidebar-foot">
          <span className="proto-note" style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {session ? session.user.email : "未登录"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {session && (
              <button
                type="button"
                className="link-btn"
                style={{ fontSize: 10.5 }}
                onClick={() => supabase.auth.signOut()}
              >
                退出
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <main className="reader">
        {error && (
          <div className="reader-inner" style={{ marginBottom: 16 }}>
            <div className="notice" style={{ marginTop: 0 }}>
              {error}
              <button
                type="button"
                className="link-btn"
                style={{ marginLeft: 8, color: "var(--brand)" }}
                onClick={reload}
              >
                重试
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="empty">加载中…</div>
        ) : !session ? (
          <div className="empty">
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: 10 }}>登录后才能看到自己的日记</div>
              <Link href="/login" className="primary-btn">
                去登录
              </Link>
            </div>
          </div>
        ) : selected ? (
          <article className="reader-inner">
            <div className="crumbs">{formatDate(selected.entryDate)}</div>
            <h1>{selected.title || "无标题"}</h1>
            <div className="meta">
              <span className="pill">
                <i className="mood-dot" style={{ background: MOOD_COLOR[selected.mood] }} />
                {selected.mood}
              </span>
              {selected.tags.map((tag) => (
                <span key={tag} className="chip">
                  #{tag}
                </span>
              ))}
              <span className="private-note">
                {selected.isPublic ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M2 12h20M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
                    </svg>
                    已开启分享
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="4" y="10" width="16" height="10" rx="2" />
                      <path d="M8 10V7a4 4 0 018 0v3" />
                    </svg>
                    仅自己可见
                  </>
                )}
              </span>
            </div>

            <div className="prose">
              <Markdown remarkPlugins={[remarkGfm]}>{selected.contentMd}</Markdown>
            </div>

            <div className="reader-foot">
              <Link className="link-btn" href={`/diary/write?id=${selected.id}`}>
                编辑
              </Link>
              <span>·</span>
              <button type="button" className="link-btn" onClick={() => handleShare(selected)}>
                {selected.isPublic ? "关闭分享" : "分享"}
              </button>
              <span>·</span>
              <button type="button" className="link-btn danger" onClick={() => handleDelete(selected.id)}>
                删除
              </button>
              {selected.isPublic && selected.shareSlug && (
                <span className="share-hint">
                  /s/{selected.shareSlug} ·{" "}
                  <button type="button" className="link-btn" onClick={() => copyLink(selected.shareSlug!)}>
                    {copied ? "已复制" : "复制链接"}
                  </button>
                </span>
              )}
              <span style={{ marginLeft: selected.isPublic ? 0 : "auto" }}>
                写于 {formatTime(selected.createdAt)} · 更新于 {formatTime(selected.updatedAt)}
              </span>
            </div>
          </article>
        ) : (
          <div className="empty">还没有日记，点右上角「新建」写下第一篇。</div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
