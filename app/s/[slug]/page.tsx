"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPublicEntry } from "@/lib/entries";
import { formatDate } from "@/lib/format";
import { AUTHOR_NAME, SITE_NAME } from "@/lib/site";
import type { Entry } from "@/lib/types";

export default function SharePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [entry, setEntry] = useState<Entry | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    if (!slug) return;
    getPublicEntry(slug)
      .then((data) => {
        setEntry(data);
        setState(data ? "ready" : "missing");
      })
      .catch(() => setState("error"));
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="share-page">
        <div className="share-card" style={{ color: "var(--muted)", fontSize: 13 }}>
          加载中…
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="share-page">
        <div className="share-card">
          <div className="share-kicker">{SITE_NAME} · 分享</div>
          <h1 style={{ fontSize: 20 }}>
            {state === "error" ? "加载失败，请稍后重试" : "这篇分享不存在或已关闭"}
          </h1>
          <div className="share-foot">
            <span>链接可能已失效</span>
            <span>{SITE_NAME}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="share-page">
      <article className="share-card">
        <div className="share-kicker">{SITE_NAME} · 分享</div>
        <h1>{entry.title || "无标题"}</h1>
        <div className="share-who">
          <span className="avatar">{AUTHOR_NAME.slice(0, 1)}</span>
          <span>{AUTHOR_NAME}</span>
          <span>·</span>
          <span>{formatDate(entry.entryDate)}</span>
        </div>
        <div className="prose" style={{ fontSize: 15 }}>
          <Markdown remarkPlugins={[remarkGfm]}>{entry.contentMd}</Markdown>
        </div>
        <div className="share-foot">
          <span>这篇日记由作者公开分享，其余内容不对外可见</span>
          <span>由 {SITE_NAME} 提供</span>
        </div>
      </article>
    </div>
  );
}
