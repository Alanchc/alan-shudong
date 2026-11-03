"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import MarkdownBody from "@/components/MarkdownBody";
import HomeLink from "@/components/HomeLink";
import { currentUserId } from "@/lib/auth";
import { createEntry, getEntry, updateEntry } from "@/lib/entries";
import { supabase } from "@/lib/supabase";
import { SITE_NAME } from "@/lib/site";
import { MOODS, VISIBILITIES, type Mood, type Visibility } from "@/lib/types";
import { useIsMobile } from "@/lib/useIsMobile";
import { useSession } from "@/lib/useSession";

function today(): string {
  return new Date().toLocaleDateString("sv-SE");
}

export default function Editor({ entryId }: { entryId: string | null }) {
  const router = useRouter();
  const session = useSession();
  const isMobile = useIsMobile();

  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(today());
  const [mood, setMood] = useState<Mood>("平静");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [tags, setTags] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(entryId === null);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const draftKey = `diary:draft:${entryId ?? "new"}`;

  useEffect(() => {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as {
        title?: string;
        content?: string;
        date?: string;
        mood?: Mood;
        tags?: string;
        visibility?: Visibility;
      };
      if (draft.title !== undefined) setTitle(draft.title);
      if (draft.content !== undefined) setContent(draft.content);
      if (draft.date !== undefined) setDate(draft.date);
      if (draft.mood !== undefined) setMood(draft.mood);
      if (draft.tags !== undefined) setTags(draft.tags);
      if (draft.visibility !== undefined) setVisibility(draft.visibility);
    } catch {
      // 草稿损坏时忽略
    }
  }, [draftKey]);

  useEffect(() => {
    if (!entryId) return;
    getEntry(entryId)
      .then((entry) => {
        if (!entry) {
          setError("这篇日记不存在或无权访问");
          return;
        }
        setTitle(entry.title);
        setContent(entry.contentMd);
        setDate(entry.entryDate);
        setMood(entry.mood);
        setTags(entry.tags.join("，"));
        setVisibility(entry.visibility);
        setReady(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, [entryId]);

  useEffect(() => {
    if (!ready) return;
    setDirty(true);
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify({ title, content, date, mood, tags, visibility }));
      setSavedAt(new Date().toTimeString().slice(0, 5));
      setDirty(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [title, content, date, mood, tags, visibility, draftKey, ready]);

  function applyChange(next: string, start: number, end: number) {
    setContent(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    });
  }

  function wrap(before: string, after: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    applyChange(
      content.slice(0, start) + before + selected + after + content.slice(end),
      start + before.length,
      end + before.length,
    );
  }

  function prefixLines(prefix: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = content.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const end = el.selectionEnd;
    const block = content.slice(start, end) || "";
    const next = block
      .split("\n")
      .map((line) => prefix + line)
      .join("\n");
    applyChange(
      content.slice(0, start) + next + content.slice(end),
      start + prefix.length,
      end + next.length,
    );
  }

  function insertAtCursor(text: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? content.length;
    const end = el?.selectionEnd ?? content.length;
    setContent(content.slice(0, start) + text + content.slice(end));
    requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      target.focus();
      const caret = start + text.length;
      target.setSelectionRange(caret, caret);
    });
  }

  async function handlePickImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const me = await currentUserId();
      if (!me) throw new Error("登录状态已失效，请重新登录");

      const snippets: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} 不是图片文件`);
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} 超过 5MB`);
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${me}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("entry-images")
          .upload(path, file, { cacheControl: "31536000", contentType: file.type });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("entry-images").getPublicUrl(path);
        snippets.push(`\n![图片](${data.publicUrl})\n`);
      }
      insertAtCursor(snippets.join(""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!title.trim() && !content.trim()) {
      setError("标题和内容都是空的，先写点什么吧");
      return;
    }
    setSaving(true);
    setError(null);
    const input = {
      title: title.trim(),
      contentMd: content,
      entryDate: date,
      mood,
      tags: tags.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean),
      visibility,
    };
    try {
      if (entryId) await updateEntry(entryId, input);
      else await createEntry(input);
      localStorage.removeItem(draftKey);
      router.push("/diary");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      setSaving(false);
    }
  }

  const tagList = tags.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean);

  if (session === null) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div className="auth-brand" style={{ justifyContent: "center" }}>
            <span className="logo">树</span>
            <h1>{SITE_NAME}</h1>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18 }}>
            先登录才能写日记
          </p>
          <Link href="/login" className="primary-btn auth-submit" style={{ display: "inline-flex" }}>
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-shell">
      <div className="topbar">
        <Link href="/diary" className="icon-btn" aria-label="返回列表">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <HomeLink />
        <input
          type="date"
          className="date-input"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          aria-label="日期"
        />
        <select
          className="mood-select"
          value={mood}
          onChange={(event) => setMood(event.target.value as Mood)}
          aria-label="心情"
        >
          {MOODS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          className="visibility-select"
          value={visibility}
          onChange={(event) => setVisibility(event.target.value as Visibility)}
          aria-label="可见范围"
        >
          {VISIBILITIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          className="tag-input"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="标签，逗号分隔"
          aria-label="标签"
        />
        <span className="spacer" />
        {isMobile && (
          <div className="view-switch">
            <button
              type="button"
              className={mobileView === "edit" ? "on" : ""}
              onClick={() => setMobileView("edit")}
            >
              编辑
            </button>
            <button
              type="button"
              className={mobileView === "preview" ? "on" : ""}
              onClick={() => setMobileView("preview")}
            >
              预览
            </button>
          </div>
        )}
        <span className="save-state">
          {dirty ? "编辑中…" : savedAt ? `草稿 ${savedAt}` : "未保存"}
        </span>
        <button
          type="button"
          className="primary-btn"
          onClick={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "保存中…" : "完成"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
          <div className="notice" style={{ marginTop: 0 }}>{error}</div>
        </div>
      )}

      <div className={mobileView === "preview" ? "editor-split show-preview" : "editor-split"}>
        <div className="pane">
          <div className="toolbar">
            <button type="button" onClick={() => wrap("# ", "")}>
              H1
            </button>
            <button type="button" onClick={() => wrap("## ", "")}>
              H2
            </button>
            <span className="divider" />
            <button type="button" style={{ fontWeight: 700 }} onClick={() => wrap("**", "**")}>
              B
            </button>
            <button type="button" style={{ fontStyle: "italic" }} onClick={() => wrap("*", "*")}>
              I
            </button>
            <span className="divider" />
            <button type="button" onClick={() => prefixLines("- ")}>
              · 列表
            </button>
            <button type="button" onClick={() => wrap("[", "](https://)")}>
              链接
            </button>
            <button type="button" onClick={() => wrap("`", "`")}>
              代码
            </button>
            <span className="divider" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ opacity: uploading ? 0.6 : 1 }}
            >
              {uploading ? "上传中…" : "图片"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              hidden
              onChange={handlePickImages}
            />
          </div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="标题"
            aria-label="标题"
            style={{
              border: 0,
              outline: 0,
              background: "transparent",
              padding: "18px 24px 8px",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--text)",
            }}
          />
          <textarea
            ref={textareaRef}
            className="editor-input"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="写点什么……支持 Markdown"
            spellCheck={false}
          />
        </div>

        <div className="pane">
          <div className="pane-head">预览</div>
          <div className="preview-scroll">
            {title && (
              <h1 style={{ fontSize: 22, margin: "8px 0 10px", fontWeight: 600 }}>{title}</h1>
            )}
            <div className="meta" style={{ marginBottom: 16 }}>
              <span className="pill">{mood}</span>
              {tagList.map((tag) => (
                <span key={tag} className="chip">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="prose">
              {content ? (
                <MarkdownBody>{content}</MarkdownBody>
              ) : (
                <p style={{ color: "var(--muted)" }}>左边写，这里实时预览。</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
