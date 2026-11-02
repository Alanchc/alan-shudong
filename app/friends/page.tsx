"use client";

import Link from "next/link";
import HomeLink from "@/components/HomeLink";
import { useCallback, useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import UserAvatar, { personName } from "@/components/UserAvatar";
import {
  acceptRequest,
  listRelations,
  removeRelation,
  searchProfiles,
  sendFriendRequest,
  type FriendProfile,
  type Relation,
} from "@/lib/friends";
import { SITE_NAME } from "@/lib/site";
import { useSession } from "@/lib/useSession";

export default function FriendsPage() {
  const session = useSession();
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendProfile[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listRelations();
      setRelations(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "好友列表加载失败");
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    refresh().finally(() => setLoading(false));
  }, [session, refresh]);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await searchProfiles(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : "搜索失败");
    } finally {
      setSearching(false);
    }
  }

  async function run(key: string, action: () => Promise<void>, done?: string) {
    setBusyId(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      await refresh();
      if (done) setNotice(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  }

  function relationOf(personId: string) {
    return relations.find((item) => item.other.id === personId) ?? null;
  }

  const incoming = relations.filter((item) => item.direction === "incoming");
  const outgoing = relations.filter((item) => item.direction === "outgoing");
  const friends = relations.filter((item) => item.direction === "friend");

  return (
    <div className="friends-page">
      <div className="friends-inner">
        <div className="me-head">
          <span className="logo">树</span>
          <span className="brand-name">{SITE_NAME}</span>
          <HomeLink style={{ marginLeft: "auto" }} />
        </div>

        {session ? (
          <>
            <div className="me-card friends-card">
              <label className="me-field">
                <span>按用户名添加好友</span>
                <div className="friends-search-row">
                  <input
                    value={query}
                    placeholder="输入对方的用户名，如 alan_01"
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSearch();
                    }}
                  />
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={searching || !query.trim()}
                    onClick={handleSearch}
                  >
                    {searching ? "搜索中…" : "搜索"}
                  </button>
                </div>
              </label>

              {results && (
                <div className="friends-results">
                  {results.length === 0 ? (
                    <div className="profile-empty">没有找到这个用户名</div>
                  ) : (
                    results.map((person) => {
                      const relation = relationOf(person.id);
                      const key = `search-${person.id}`;
                      return (
                        <div key={person.id} className="friend-row">
                          <UserAvatar person={person} size={38} />
                          <div className="friend-meta">
                            <div className="friend-name">{personName(person)}</div>
                            <div className="friend-sub">@{person.username}</div>
                          </div>
                          {!relation ? (
                            <button
                              type="button"
                              className="btn-sm"
                              disabled={busyId === key}
                              onClick={() =>
                                run(
                                  key,
                                  () => sendFriendRequest(person.id),
                                  `已向 @${person.username} 发送好友申请`,
                                )
                              }
                            >
                              加好友
                            </button>
                          ) : relation.direction === "incoming" ? (
                            <button
                              type="button"
                              className="btn-sm"
                              disabled={busyId === key}
                              onClick={() =>
                                run(key, () => acceptRequest(relation.id), "你们已经是好友了")
                              }
                            >
                              同意
                            </button>
                          ) : (
                            <span className="friend-tag">
                              {relation.direction === "friend" ? "已是好友" : "等待验证"}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {error && <div className="form-error">{error}</div>}
            {notice && <div className="form-note">{notice}</div>}

            <section className="friends-section">
              <div className="friends-section-title">
                好友申请
                {incoming.length > 0 && <span className="friends-badge">{incoming.length}</span>}
              </div>
              {incoming.length === 0 ? (
                <div className="profile-empty">暂时没有新的申请</div>
              ) : (
                incoming.map((relation) => (
                  <div key={relation.id} className="friend-row">
                    <UserAvatar person={relation.other} size={38} />
                    <div className="friend-meta">
                      <div className="friend-name">{personName(relation.other)}</div>
                      <div className="friend-sub">@{relation.other.username} 想加你为好友</div>
                    </div>
                    <div className="friend-actions">
                      <button
                        type="button"
                        className="btn-sm"
                        disabled={busyId === relation.id}
                        onClick={() =>
                          run(relation.id, () => acceptRequest(relation.id), "已同意好友申请")
                        }
                      >
                        同意
                      </button>
                      <button
                        type="button"
                        className="btn-sm btn-ghost"
                        disabled={busyId === relation.id}
                        onClick={() => run(relation.id, () => removeRelation(relation.id), "已拒绝")}
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>

            <section className="friends-section">
              <div className="friends-section-title">
                我的好友 <span>{friends.length}</span>
              </div>
              {loading ? (
                <div className="skeleton" style={{ height: 56 }} />
              ) : friends.length === 0 ? (
                <div className="profile-empty">还没有好友，搜索用户名添加吧</div>
              ) : (
                friends.map((relation) => (
                  <div key={relation.id} className="friend-row">
                    <UserAvatar person={relation.other} size={38} />
                    <div className="friend-meta">
                      <Link href={`/u/${relation.other.username}`} className="friend-name">
                        {personName(relation.other)}
                      </Link>
                      <div className="friend-sub">@{relation.other.username}</div>
                    </div>
                    <Link href={`/u/${relation.other.username}`} className="link-btn friend-link">
                      主页
                    </Link>
                    <Link href={`/chat/${relation.other.username}`} className="btn-sm">
                      消息
                    </Link>
                    <button
                      type="button"
                      className="btn-sm btn-ghost"
                      disabled={busyId === relation.id}
                      onClick={() =>
                        run(relation.id, () => removeRelation(relation.id), "已删除好友")
                      }
                    >
                      删除
                    </button>
                  </div>
                ))
              )}
            </section>

            {outgoing.length > 0 && (
              <section className="friends-section">
                <div className="friends-section-title">已发出的申请</div>
                {outgoing.map((relation) => (
                  <div key={relation.id} className="friend-row">
                    <UserAvatar person={relation.other} size={38} />
                    <div className="friend-meta">
                      <div className="friend-name">{personName(relation.other)}</div>
                      <div className="friend-sub">@{relation.other.username} · 等待对方同意</div>
                    </div>
                    <button
                      type="button"
                      className="btn-sm btn-ghost"
                      disabled={busyId === relation.id}
                      onClick={() =>
                        run(relation.id, () => removeRelation(relation.id), "已取消申请")
                      }
                    >
                      取消
                    </button>
                  </div>
                ))}
              </section>
            )}
          </>
        ) : (
          <div className="me-card">
            <div className="me-label">登录后才能添加好友</div>
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
