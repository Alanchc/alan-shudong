"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import MarkdownBody from "@/components/MarkdownBody";
import HomeLink from "@/components/HomeLink";
import { listUserEntries } from "@/lib/entries";
import { excerpt, formatDate, MOOD_COLOR } from "@/lib/format";
import {
  acceptRequest,
  getRelationWith,
  sendFriendRequest,
  type Relation,
} from "@/lib/friends";
import { getProfileByHandle, type Profile } from "@/lib/profiles";
import type { Entry } from "@/lib/types";
import { useSession } from "@/lib/useSession";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const session = useSession();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [relation, setRelation] = useState<Relation | null>(null);
  const [relationReady, setRelationReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    let alive = true;
    setLoading(true);

    getProfileByHandle(username)
      .then(async (found) => {
        if (!alive) return;
        if (!found) {
          setNotFound(true);
          return;
        }
        setProfile(found);
        const list = await listUserEntries(found.id);
        if (alive) setEntries(list);
      })
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [username]);

  useEffect(() => {
    if (!profile || session === undefined) return;
    if (!session || session.user.id === profile.id) {
      setRelation(null);
      setRelationReady(true);
      return;
    }
    let alive = true;
    getRelationWith(profile.id)
      .then((found) => alive && setRelation(found))
      .catch(() => alive && setRelation(null))
      .finally(() => alive && setRelationReady(true));
    return () => {
      alive = false;
    };
  }, [profile, session]);

  async function handleAddFriend() {
    if (!profile) return;
    setBusy(true);
    setActionError(null);
    try {
      await sendFriendRequest(profile.id);
      setRelation(await getRelationWith(profile.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept() {
    if (!relation || !profile) return;
    setBusy(true);
    setActionError(null);
    try {
      await acceptRequest(relation.id);
      setRelation(await getRelationWith(profile.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-inner">
          <div className="skeleton" style={{ height: 96 }} />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="profile-page">
        <div className="profile-inner">
          <div className="page-nav">
            <HomeLink />
          </div>
          <div className="profile-empty">
            没有找到 @{username} 这个用户
          </div>
        </div>
      </div>
    );
  }

  const name = profile.nickname || profile.username;
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-inner">
        <div className="page-nav">
          <HomeLink />
        </div>
        <div className="profile-head">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="avatar" src={profile.avatarUrl} alt={name} />
          ) : (
            <div className="avatar avatar-fallback">{initial}</div>
          )}
          <div className="profile-meta">
            <div className="profile-name">{name}</div>
            <div className="profile-username">@{profile.username}</div>
            {profile.bio && <div className="profile-bio">{profile.bio}</div>}
          </div>
          <div className="profile-action">
            {session && profile.id === session.user.id ? (
              <Link href="/me" className="btn-sm btn-ghost">
                编辑资料
              </Link>
            ) : !session ? (
              <Link href="/login" className="btn-sm">
                登录后加好友
              </Link>
            ) : relationReady && relation?.direction === "friend" ? (
              <Link href={`/chat/${profile.username}`} className="btn-sm">
                发消息
              </Link>
            ) : relationReady && relation?.direction === "outgoing" ? (
              <span className="friend-tag">等待验证</span>
            ) : relationReady && relation?.direction === "incoming" ? (
              <button type="button" className="btn-sm" disabled={busy} onClick={handleAccept}>
                {busy ? "处理中…" : "同意好友申请"}
              </button>
            ) : relationReady ? (
              <button type="button" className="btn-sm" disabled={busy} onClick={handleAddFriend}>
                {busy ? "发送中…" : "加好友"}
              </button>
            ) : null}
          </div>
        </div>

        {actionError && <div className="form-error" style={{ marginBottom: 16 }}>{actionError}</div>}

        <div className="profile-section">
          <div className="profile-section-title">
            日记 <span>{entries.length}</span>
          </div>

          {entries.length === 0 ? (
            <div className="profile-empty">
              {relation?.direction === "friend" || session?.user.id === profile.id
                ? "还没有写过日记"
                : "还没有公开的日记"}
            </div>
          ) : (
            <div className="profile-list">
              {entries.map((entry) => {
                const open = expanded === entry.id;
                return (
                  <div key={entry.id} className="profile-entry">
                    <button
                      type="button"
                      className="profile-entry-head"
                      onClick={() => setExpanded(open ? null : entry.id)}
                    >
                      <span className="profile-entry-date">{formatDate(entry.entryDate)}</span>
                      <span className={`profile-vis ${entry.visibility}`}>
                        {entry.visibility === "public"
                          ? "公开"
                          : entry.visibility === "friends"
                            ? "仅好友"
                            : "私密"}
                      </span>
                      <span
                        className="mood-dot"
                        style={{ background: MOOD_COLOR[entry.mood] }}
                        title={entry.mood}
                      />
                    </button>
                    <div className="profile-entry-title">{entry.title || "无标题"}</div>
                    {open ? (
                      <div className="prose profile-entry-body">
                        <MarkdownBody>{entry.contentMd}</MarkdownBody>
                      </div>
                    ) : (
                      <div className="profile-entry-excerpt">{excerpt(entry.contentMd)}</div>
                    )}
                    {entry.visibility === "public" && entry.shareSlug && (
                      <Link href={`/s/${entry.shareSlug}`} className="link-btn profile-entry-link">
                        分享页 →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
