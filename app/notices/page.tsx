"use client";

import Link from "next/link";
import HomeLink from "@/components/HomeLink";
import MobileNav from "@/components/MobileNav";
import UserAvatar, { personName } from "@/components/UserAvatar";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/errors";
import { searchProfiles, type FriendProfile } from "@/lib/friends";
import {
  createAnnouncement,
  deleteAnnouncement,
  grantAdmin,
  isCurrentUserAdmin,
  listAdmins,
  listAnnouncements,
  markAnnouncementsRead,
  readSeenAt,
  revokeAdmin,
  type AdminMember,
  type Announcement,
} from "@/lib/notices";
import { normalizeUsername } from "@/lib/profiles";
import { SITE_NAME } from "@/lib/site";
import { mediaUrl } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

function listStamp(iso: string) {
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

function stamp(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (date.toDateString() === now.toDateString()) return `今天 ${time}`;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day} ${time}`;
}

export default function NoticesPage() {
  const session = useSession();

  const [notices, setNotices] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const seenAtRef = useRef<string | null | undefined>(undefined);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await listAnnouncements();
    setNotices(list);
    // 首次加载时冻结「已读时间点」，轮询时不再重算，避免红点在停留期间自己消失
    if (seenAtRef.current === undefined) {
      seenAtRef.current = session ? readSeenAt(session.user.id) : null;
    }
    const cutoff = seenAtRef.current;
    setUnreadIds(
      new Set(
        cutoff ? list.filter((item) => item.createdAt > cutoff).map((item) => item.id) : list.map((item) => item.id),
      ),
    );
    await markAnnouncementsRead(list[0]?.createdAt);
    return list;
  }, [session]);

  useEffect(() => {
    if (!session) return;
    let alive = true;

    setLoading(true);
    Promise.all([refresh(), isCurrentUserAdmin()])
      .then(([, admin]) => {
        if (!alive) return;
        setIsAdmin(admin);
        setError(null);
      })
      .catch((err) => {
        if (alive) setError(errorMessage(err, "通知加载失败"));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refresh()
        .then(() => alive && setError(null))
        .catch(() => {});
    }, 30000);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      refresh()
        .then(() => alive && setError(null))
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session, refresh]);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;

    listAdmins()
      .then((list) => {
        if (alive) setAdmins(list);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [isAdmin]);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || posting) return;

    setPosting(true);
    setError(null);
    try {
      await createAnnouncement(title, body);
      setTitle("");
      setBody("");
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "发布失败"));
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("删除这条通知？")) return;

    setBusyId(id);
    setError(null);
    try {
      await deleteAnnouncement(id);
      setNotices((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(errorMessage(err, "删除失败"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!query || searching) return;

    setSearching(true);
    setError(null);
    try {
      setCandidates(await searchProfiles(query));
    } catch (err) {
      setError(errorMessage(err, "搜索失败"));
    } finally {
      setSearching(false);
    }
  }

  async function promote(person: FriendProfile) {
    setBusyId(person.id);
    setError(null);
    try {
      await grantAdmin(person.id);
      setCandidates([]);
      setQuery("");
      setAdmins(await listAdmins());
    } catch (err) {
      setError(errorMessage(err, "设置管理员失败"));
    } finally {
      setBusyId(null);
    }
  }

  async function demote(person: AdminMember) {
    if (!window.confirm(`取消 ${personName(person)} 的管理员身份？`)) return;

    setBusyId(person.id);
    setError(null);
    try {
      await revokeAdmin(person.id);
      setAdmins((prev) => prev.filter((item) => item.id !== person.id));
    } catch (err) {
      setError(errorMessage(err, "取消管理员失败"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="me-page">
      <div className="me-inner">
        <div className="me-head">
          <span className="logo">树</span>
          <span className="brand-name">{SITE_NAME}</span>
          <HomeLink style={{ marginLeft: "auto" }} />
        </div>

        {session ? (
          <>
            {error && <div className="form-error">{error}</div>}

            {isAdmin && (
              <section className="friends-section">
                <div className="friends-section-title">发布通知</div>
                <form className="notice-form" onSubmit={publish}>
                  <input
                    value={title}
                    maxLength={40}
                    placeholder="标题（可留空）"
                    onChange={(event) => setTitle(event.target.value)}
                  />
                  <textarea
                    value={body}
                    maxLength={2000}
                    rows={4}
                    placeholder="写点什么，所有登录用户都会看到"
                    onChange={(event) => setBody(event.target.value)}
                  />
                  <div className="notice-form-foot">
                    <span className="notice-count">{body.length}/2000</span>
                    <button
                      type="submit"
                      className="primary-btn"
                      disabled={posting || !body.trim()}
                    >
                      {posting ? "发布中…" : "发布"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="friends-section">
              <div className="friends-section-title">
                通知
                {notices.length > 0 && <span>{notices.length}</span>}
              </div>

              {loading ? (
                <div className="skeleton" style={{ height: 72, marginBottom: 10 }} />
              ) : notices.length === 0 ? (
                <div className="profile-empty">
                  还没有通知
                  {isAdmin && <div style={{ marginTop: 8 }}>在上面发布第一条吧</div>}
                </div>
              ) : (
                <div className="notice-list">
                  {notices.map((item) => {
                    const open = expandedId === item.id;
                    const unread = unreadIds.has(item.id);
                    const avatar = mediaUrl(item.authorAvatarUrl);
                    return (
                      <article
                        key={item.id}
                        className={unread ? "notice-row unread" : "notice-row"}
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedId(open ? null : item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setExpandedId(open ? null : item.id);
                          }
                        }}
                      >
                        <div className="notice-avatar">
                          {avatar ? <img src={avatar} alt="" /> : item.authorName.slice(0, 1)}
                        </div>
                        <div className="notice-main">
                          <div className="notice-top">
                            <span className="notice-name">{item.authorName}</span>
                            <span className="notice-time">
                              {open ? stamp(item.createdAt) : listStamp(item.createdAt)}
                            </span>
                          </div>
                          {open ? (
                            <>
                              {item.title && <div className="notice-title">{item.title}</div>}
                              <div className="notice-full">{item.body}</div>
                              {isAdmin && (
                                <div className="notice-actions">
                                  <button
                                    type="button"
                                    className="link-btn danger"
                                    disabled={busyId === item.id}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      remove(item.id);
                                    }}
                                  >
                                    {busyId === item.id ? "删除中…" : "删除"}
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="notice-preview">
                              {item.title && <b>{item.title}</b>}
                              {item.title ? "　" : ""}
                              {item.body}
                            </div>
                          )}
                        </div>
                        {unread && <span className="notice-dot" />}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {isAdmin && (
              <section className="friends-section">
                <div className="friends-section-title">
                  管理员
                  {admins.length > 0 && <span>{admins.length}</span>}
                </div>

                <form className="admin-search" onSubmit={handleSearch}>
                  <input
                    value={query}
                    placeholder="按用户名搜索，设置他人为管理员"
                    onChange={(event) => setQuery(normalizeUsername(event.target.value))}
                  />
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={!query || searching}
                  >
                    {searching ? "搜索中…" : "搜索"}
                  </button>
                </form>

                {candidates.map((person) => (
                  <div key={person.id} className="admin-row">
                    <UserAvatar person={person} size={34} />
                    <div className="admin-name">
                      {personName(person)}
                      <span className="admin-sub">@{person.username}</span>
                    </div>
                    <button
                      type="button"
                      className="link-btn"
                      disabled={busyId === person.id}
                      onClick={() => promote(person)}
                    >
                      {busyId === person.id ? "设置中…" : "设为管理员"}
                    </button>
                  </div>
                ))}

                {admins.map((person) => (
                  <div key={person.id} className="admin-row">
                    <UserAvatar person={person} size={34} />
                    <div className="admin-name">
                      {personName(person)}
                      <span className="admin-sub">@{person.username}</span>
                    </div>
                    {person.id === session.user.id ? (
                      <span className="admin-self">你</span>
                    ) : (
                      <button
                        type="button"
                        className="link-btn"
                        disabled={busyId === person.id}
                        onClick={() => demote(person)}
                      >
                        {busyId === person.id ? "处理中…" : "取消管理员"}
                      </button>
                    )}
                  </div>
                ))}
              </section>
            )}
          </>
        ) : (
          <div className="me-card">
            <div className="me-label">登录后才能查看通知</div>
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
