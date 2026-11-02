"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MobileNav from "@/components/MobileNav";
import { deleteEntry, getEntry, setShare } from "@/lib/entries";
import { formatDate, formatTime, MOOD_COLOR } from "@/lib/format";
import type { Entry } from "@/lib/types";

export default function EntryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getEntry(id)
      .then((data) => {
        if (!data) setError("这篇日记不存在或无权访问");
        setEntry(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!entry) return;
    if (!window.confirm("删除后无法恢复，确定删除这篇日记吗？")) return;
    try {
      await deleteEntry(entry.id);
      router.push("/diary");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function handleShare() {
    if (!entry) return;
    try {
      const updated = await setShare(entry.id, !entry.isPublic);
      setEntry(updated);
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
    <div className="entry-page">
      <div className="entry-bar">
        <Link href="/diary" className="icon-btn" aria-label="返回列表">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <span className="entry-bar-title">日记</span>
        {entry && (
          <Link href={`/diary/write?id=${entry.id}`} className="primary-btn" style={{ marginLeft: "auto" }}>
            编辑
          </Link>
        )}
      </div>

      {loading ? (
        <div className="empty">加载中…</div>
      ) : error ? (
        <div className="empty">
          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: 10 }}>{error}</div>
            <Link href="/diary" className="link-btn" style={{ color: "var(--brand)" }}>
              返回日记列表
            </Link>
          </div>
        </div>
      ) : entry ? (
        <article className="reader-inner">
          <div className="crumbs">{formatDate(entry.entryDate)}</div>
          <h1>{entry.title || "无标题"}</h1>
          <div className="meta">
            <span className="pill">
              <i className="mood-dot" style={{ background: MOOD_COLOR[entry.mood] }} />
              {entry.mood}
            </span>
            {entry.tags.map((tag) => (
              <span key={tag} className="chip">
                #{tag}
              </span>
            ))}
            <span className="private-note">
              {entry.isPublic ? "已开启分享" : "仅自己可见"}
            </span>
          </div>

          <div className="prose">
            <Markdown remarkPlugins={[remarkGfm]}>{entry.contentMd}</Markdown>
          </div>

          <div className="reader-foot" style={{ flexWrap: "wrap" }}>
            <Link className="link-btn" href={`/diary/write?id=${entry.id}`}>
              编辑
            </Link>
            <span>·</span>
            <button type="button" className="link-btn" onClick={handleShare}>
              {entry.isPublic ? "关闭分享" : "分享"}
            </button>
            <span>·</span>
            <button type="button" className="link-btn danger" onClick={handleDelete}>
              删除
            </button>
          </div>

          {entry.isPublic && entry.shareSlug && (
            <div className="share-hint" style={{ marginLeft: 0, marginTop: 10 }}>
              /s/{entry.shareSlug} ·{" "}
              <button type="button" className="link-btn" onClick={() => copyLink(entry.shareSlug!)}>
                {copied ? "已复制" : "复制链接"}
              </button>
            </div>
          )}

          <div style={{ marginTop: 18, fontSize: 11, color: "var(--muted)" }}>
            写于 {formatTime(entry.createdAt)} · 更新于 {formatTime(entry.updatedAt)}
          </div>
        </article>
      ) : null}

      <MobileNav />
    </div>
  );
}
