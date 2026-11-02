"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { listPublicEntries } from "@/lib/entries";
import { excerpt, formatDate, MOOD_COLOR } from "@/lib/format";
import { getProfileByUsername, type Profile } from "@/lib/profiles";
import type { Entry } from "@/lib/types";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    let alive = true;
    setLoading(true);

    getProfileByUsername(username)
      .then(async (found) => {
        if (!alive) return;
        if (!found) {
          setNotFound(true);
          return;
        }
        setProfile(found);
        const list = await listPublicEntries(found.id);
        if (alive) setEntries(list);
      })
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [username]);

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
          <div className="profile-empty">
            没有找到 @{username} 这个用户
            <Link href="/" className="link-btn" style={{ marginTop: 12 }}>
              返回首页
            </Link>
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
        </div>

        <div className="profile-section">
          <div className="profile-section-title">
            公开日记 <span>{entries.length}</span>
          </div>

          {entries.length === 0 ? (
            <div className="profile-empty">还没有公开的日记</div>
          ) : (
            <div className="profile-list">
              {entries.map((entry) => (
                <Link key={entry.id} href={`/s/${entry.shareSlug}`} className="profile-entry">
                  <div className="profile-entry-top">
                    <span className="profile-entry-date">{formatDate(entry.entryDate)}</span>
                    <span
                      className="mood-dot"
                      style={{ background: MOOD_COLOR[entry.mood] }}
                      title={entry.mood}
                    />
                  </div>
                  <div className="profile-entry-title">{entry.title || "无标题"}</div>
                  <div className="profile-entry-excerpt">{excerpt(entry.contentMd)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
