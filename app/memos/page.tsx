"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import HomeLink from "@/components/HomeLink";
import MobileNav from "@/components/MobileNav";
import { errorMessage } from "@/lib/errors";
import {
  createMemo,
  deleteMemo,
  listMemos,
  setMemoPinned,
  sortMemos,
  updateMemo,
  type Memo,
} from "@/lib/memos";
import { SITE_NAME } from "@/lib/site";
import { useSession } from "@/lib/useSession";

const MAX_LEN = 2000;

function stamp(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (date.getFullYear() === now.getFullYear()) return `${month}-${day}`;
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function MemosPage() {
  const session = useSession();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setMemos(sortMemos(await listMemos()));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "备忘录加载失败"));
    }
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      setLoading(false);
      setMemos([]);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [session, refresh]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return memos;
    return memos.filter((memo) => memo.body.toLowerCase().includes(keyword));
  }, [memos, query]);

  async function handleCreate() {
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createMemo(body);
      setMemos((prev) => sortMemos([created, ...prev]));
      setDraft("");
    } catch (err) {
      setError(errorMessage(err, "保存失败"));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(memo: Memo) {
    setEditingId(memo.id);
    setEditText(memo.body);
    setError(null);
  }

  async function saveEdit(id: string) {
    const body = editText.trim();
    if (!body) return;
    setBusyId(id);
    setError(null);
    try {
      const updated = await updateMemo(id, body);
      setMemos((prev) => sortMemos(prev.map((item) => (item.id === id ? updated : item))));
      setEditingId(null);
      setEditText("");
    } catch (err) {
      setError(errorMessage(err, "保存失败"));
    } finally {
      setBusyId(null);
    }
  }

  async function togglePin(memo: Memo) {
    setBusyId(memo.id);
    setError(null);
    try {
      const updated = await setMemoPinned(memo.id, !memo.pinned);
      setMemos((prev) => sortMemos(prev.map((item) => (item.id === memo.id ? updated : item))));
    } catch (err) {
      setError(errorMessage(err, "置顶失败"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("删除后无法恢复，确定删除这条备忘录吗？")) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteMemo(id);
      setMemos((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(errorMessage(err, "删除失败"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="memo-page">
      <div className="memo-inner">
        <div className="me-head">
          <span className="logo">树</span>
          <span className="brand-name">{SITE_NAME}</span>
          <HomeLink style={{ marginLeft: "auto" }} />
        </div>

        {session ? (
          <>
            <div className="memo-composer">
              <textarea
                className="memo-input"
                value={draft}
                maxLength={MAX_LEN}
                placeholder="记点什么…想法、待买清单、临时账号"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    handleCreate();
                  }
                }}
              />
              <div className="memo-composer-foot">
                <span>
                  {draft.length}/{MAX_LEN}
                </span>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={saving || !draft.trim()}
                  onClick={handleCreate}
                >
                  {saving ? "保存中…" : "保存"}
                </button>
              </div>
            </div>

            <div className="memo-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索备忘录"
                aria-label="搜索备忘录"
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            {loading ? (
              <div className="skeleton-list">
                <div className="skeleton" style={{ height: 72 }} />
                <div className="skeleton" style={{ height: 72 }} />
              </div>
            ) : memos.length === 0 ? (
              <div className="profile-empty">还没有备忘录，在上面写一条试试</div>
            ) : filtered.length === 0 ? (
              <div className="profile-empty">没有匹配的内容</div>
            ) : (
              <div className="memo-list">
                {filtered.map((memo) => {
                  const editing = editingId === memo.id;
                  return (
                    <article
                      key={memo.id}
                      className={memo.pinned ? "memo-item pinned" : "memo-item"}
                    >
                      {editing ? (
                        <>
                          <textarea
                            className="memo-input"
                            value={editText}
                            maxLength={MAX_LEN}
                            onChange={(event) => setEditText(event.target.value)}
                            onKeyDown={(event) => {
                              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                                event.preventDefault();
                                saveEdit(memo.id);
                              }
                              if (event.key === "Escape") setEditingId(null);
                            }}
                          />
                          <div className="memo-foot">
                            <span>
                              {editText.length}/{MAX_LEN}
                            </span>
                            <div className="memo-actions">
                              <button
                                type="button"
                                className="link-btn"
                                onClick={() => setEditingId(null)}
                              >
                                取消
                              </button>
                              <button
                                type="button"
                                className="btn-sm"
                                disabled={busyId === memo.id || !editText.trim()}
                                onClick={() => saveEdit(memo.id)}
                              >
                                {busyId === memo.id ? "保存中…" : "保存"}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="memo-body">{memo.body}</div>
                          <div className="memo-foot">
                            <button
                              type="button"
                              className={memo.pinned ? "link-btn memo-pin on" : "link-btn memo-pin"}
                              disabled={busyId === memo.id}
                              onClick={() => togglePin(memo)}
                            >
                              {memo.pinned ? "已置顶" : "置顶"}
                            </button>
                            <span>·</span>
                            <span>{stamp(memo.updatedAt)}</span>
                            <div className="memo-actions">
                              <button type="button" className="link-btn" onClick={() => startEdit(memo)}>
                                编辑
                              </button>
                              <button
                                type="button"
                                className="link-btn danger"
                                disabled={busyId === memo.id}
                                onClick={() => handleDelete(memo.id)}
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : session === null ? (
          <div className="me-card">
            <div className="me-label">登录后才能记录备忘录</div>
            <Link href="/login" className="primary-btn" style={{ marginTop: 12, display: "inline-flex" }}>
              去登录
            </Link>
          </div>
        ) : null}
      </div>

      <MobileNav />
    </div>
  );
}
