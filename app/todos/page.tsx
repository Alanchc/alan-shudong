"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import HomeLink from "@/components/HomeLink";
import MobileNav from "@/components/MobileNav";
import { errorMessage } from "@/lib/errors";
import { SITE_NAME } from "@/lib/site";
import {
  createTodo,
  deleteTodo,
  listTodos,
  setTodoDone,
  updateTodo,
  type Todo,
} from "@/lib/todos";
import { useSession } from "@/lib/useSession";

const MAX_LEN = 500;

function isoDate(date: Date) {
  return date.toLocaleDateString("sv-SE");
}

function dueLabel(due: string, today: string) {
  if (due === today) return "今天";
  const base = new Date(`${today}T00:00:00`).getTime();
  const target = new Date(`${due}T00:00:00`).getTime();
  const diff = Math.round((target - base) / 86400000);
  if (diff === 1) return "明天";
  if (diff === -1) return "昨天";
  if (diff < 0) return `逾期 · ${due.slice(5).replace("-", "/")}`;
  return due.slice(5).replace("-", "/");
}

export default function TodosPage() {
  const session = useSession();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const [draft, setDraft] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editDue, setEditDue] = useState("");
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    const value = isoDate(new Date());
    setToday(value);
    setDueDate(value);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setTodos(await listTodos());
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "任务加载失败"));
    }
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      setLoading(false);
      setTodos([]);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [session, refresh]);

  const groups = useMemo(() => {
    const pending = todos.filter((todo) => !todo.done);
    return {
      overdue: pending.filter((todo) => todo.dueDate && today && todo.dueDate < today),
      todayItems: pending.filter((todo) => today && todo.dueDate === today),
      later: pending.filter((todo) => !todo.dueDate || (today && todo.dueDate > today)),
      done: todos
        .filter((todo) => todo.done)
        .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? "")),
    };
  }, [todos, today]);

  async function handleCreate() {
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createTodo(body, dueDate || null);
      setTodos((prev) => [...prev, created]);
      setDraft("");
    } catch (err) {
      setError(errorMessage(err, "添加失败"));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(todo: Todo) {
    setBusyId(todo.id);
    setError(null);
    try {
      const updated = await setTodoDone(todo.id, !todo.done);
      setTodos((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(errorMessage(err, "操作失败"));
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditText(todo.body);
    setEditDue(todo.dueDate ?? "");
    setError(null);
  }

  async function saveEdit(id: string) {
    const body = editText.trim();
    if (!body) return;
    setBusyId(id);
    setError(null);
    try {
      const updated = await updateTodo(id, body, editDue || null);
      setTodos((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setEditingId(null);
    } catch (err) {
      setError(errorMessage(err, "保存失败"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("确定删除这条任务吗？")) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(errorMessage(err, "删除失败"));
    } finally {
      setBusyId(null);
    }
  }

  function renderItem(todo: Todo) {
    if (editingId === todo.id) {
      return (
        <li key={todo.id} className="todo-item editing">
          <input
            className="todo-edit-input"
            value={editText}
            maxLength={MAX_LEN}
            autoFocus
            onChange={(event) => setEditText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveEdit(todo.id);
              if (event.key === "Escape") setEditingId(null);
            }}
          />
          <div className="todo-edit-foot">
            <input
              type="date"
              className="todo-edit-date"
              value={editDue}
              onChange={(event) => setEditDue(event.target.value)}
              aria-label="截止日期"
            />
            <div className="todo-edit-actions">
              <button
                type="button"
                className="link-btn danger"
                disabled={busyId === todo.id}
                onClick={() => handleDelete(todo.id)}
              >
                删除
              </button>
              <button type="button" className="link-btn" onClick={() => setEditingId(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn-sm"
                disabled={busyId === todo.id || !editText.trim()}
                onClick={() => saveEdit(todo.id)}
              >
                保存
              </button>
            </div>
          </div>
        </li>
      );
    }

    return (
      <li key={todo.id} className={todo.done ? "todo-item done" : "todo-item"}>
        <button
          type="button"
          className={todo.done ? "todo-check on" : "todo-check"}
          aria-label={todo.done ? "标记为未完成" : "标记为已完成"}
          disabled={busyId === todo.id}
          onClick={() => toggle(todo)}
        >
          {todo.done && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          )}
        </button>
        <button type="button" className="todo-main" onClick={() => startEdit(todo)}>
          <span className="todo-text">{todo.body}</span>
          {todo.dueDate && today && (
            <span className="todo-due">{dueLabel(todo.dueDate, today)}</span>
          )}
        </button>
      </li>
    );
  }

  const pendingCount = groups.overdue.length + groups.todayItems.length + groups.later.length;

  return (
    <div className="todo-page">
      <div className="todo-inner">
        <div className="me-head">
          <span className="logo">树</span>
          <span className="brand-name">{SITE_NAME}</span>
          <HomeLink style={{ marginLeft: "auto" }} />
        </div>

        {session ? (
          <>
            <form
              className="todo-composer"
              onSubmit={(event) => {
                event.preventDefault();
                handleCreate();
              }}
            >
              <input
                className="todo-input"
                value={draft}
                maxLength={MAX_LEN}
                placeholder="添加任务，回车确认"
                onChange={(event) => setDraft(event.target.value)}
              />
              <div className="todo-composer-foot">
                <label className="todo-date">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="4" y="5" width="16" height="15" rx="2" />
                    <path d="M4 10h16M9 3v4M15 3v4" />
                  </svg>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    aria-label="截止日期"
                  />
                </label>
                {dueDate && (
                  <button
                    type="button"
                    className="link-btn todo-clear-date"
                    onClick={() => setDueDate("")}
                  >
                    不设日期
                  </button>
                )}
                <span className="todo-composer-count">
                  {pendingCount > 0 ? `待完成 ${pendingCount}` : ""}
                </span>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving || !draft.trim()}
                >
                  {saving ? "添加中…" : "添加"}
                </button>
              </div>
            </form>

            {error && <div className="form-error">{error}</div>}

            {loading ? (
              <div className="skeleton-list">
                <div className="skeleton" style={{ height: 56 }} />
                <div className="skeleton" style={{ height: 56 }} />
                <div className="skeleton" style={{ height: 56 }} />
              </div>
            ) : todos.length === 0 ? (
              <div className="profile-empty">还没有任务，今天想完成什么？</div>
            ) : (
              <>
                {groups.overdue.length > 0 && (
                  <section className="todo-group">
                    <div className="todo-group-title danger">
                      逾期<span>{groups.overdue.length}</span>
                    </div>
                    <ul className="todo-list">{groups.overdue.map(renderItem)}</ul>
                  </section>
                )}

                {groups.todayItems.length > 0 && (
                  <section className="todo-group">
                    <div className="todo-group-title">
                      今天<span>{groups.todayItems.length}</span>
                    </div>
                    <ul className="todo-list">{groups.todayItems.map(renderItem)}</ul>
                  </section>
                )}

                {groups.later.length > 0 && (
                  <section className="todo-group">
                    <div className="todo-group-title">
                      以后<span>{groups.later.length}</span>
                    </div>
                    <ul className="todo-list">{groups.later.map(renderItem)}</ul>
                  </section>
                )}

                {groups.done.length > 0 && (
                  <section className="todo-group">
                    <button
                      type="button"
                      className="todo-group-title todo-done-toggle"
                      onClick={() => setShowDone((value) => !value)}
                    >
                      已完成<span>{groups.done.length}</span>
                      <span className="todo-done-caret">{showDone ? "收起" : "展开"}</span>
                    </button>
                    {showDone && <ul className="todo-list">{groups.done.map(renderItem)}</ul>}
                  </section>
                )}

                {pendingCount === 0 && (
                  <div className="todo-all-done">今天的任务都完成了，休息一下。</div>
                )}
              </>
            )}
          </>
        ) : session === null ? (
          <div className="me-card">
            <div className="me-label">登录后才能管理任务清单</div>
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
