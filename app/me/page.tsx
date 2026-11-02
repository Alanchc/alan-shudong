"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import MobileNav from "@/components/MobileNav";
import ThemeToggle from "@/components/ThemeToggle";
import { listEntries } from "@/lib/entries";
import {
  getMyProfile,
  normalizeUsername,
  saveProfile,
  uploadAvatar,
  type Profile,
} from "@/lib/profiles";
import { SITE_NAME } from "@/lib/site";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

export default function MePage() {
  const session = useSession();
  const [total, setTotal] = useState<number | null>(null);
  const [shared, setShared] = useState<number | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session) return;
    listEntries()
      .then((list) => {
        setTotal(list.length);
        setShared(list.filter((entry) => entry.isPublic).length);
      })
      .catch(() => setTotal(null));

    getMyProfile()
      .then((found) => {
        if (!found) return;
        setProfile(found);
        setUsername(found.username);
        setNickname(found.nickname ?? "");
        setBio(found.bio ?? "");
        setAvatarUrl(found.avatarUrl);
      })
      .catch(() => setError("资料加载失败"));
  }, [session]);

  async function handleAvatar(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadAvatar(file);
      setAvatarUrl(url);
      setNotice("头像已上传，记得点保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "头像上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await saveProfile({ username, nickname, bio, avatarUrl });
      setProfile(saved);
      setUsername(saved.username);
      setNotice("已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const displayName = nickname || username || "我";

  return (
    <div className="me-page">
      <div className="me-inner">
        <div className="me-head">
          <span className="logo">树</span>
          <span className="brand-name">{SITE_NAME}</span>
          <Link href="/" className="link-btn" style={{ marginLeft: "auto", fontSize: 11 }}>
            返回首页
          </Link>
        </div>

        {session ? (
          <>
            <div className="me-card me-profile">
              <div className="me-profile-head">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="avatar" src={avatarUrl} alt={displayName} />
                ) : (
                  <div className="avatar avatar-fallback">{displayName.slice(0, 1).toUpperCase()}</div>
                )}
                <div>
                  <div className="me-value">{displayName}</div>
                  <div className="me-label">{session.user.email}</div>
                  <button
                    type="button"
                    className="link-btn"
                    style={{ marginTop: 6, fontSize: 11 }}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? "上传中…" : "更换头像"}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleAvatar(file);
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>

              <label className="me-field">
                <span>用户名</span>
                <input
                  value={username}
                  placeholder="3–20 位小写字母、数字、下划线"
                  onChange={(event) => setUsername(normalizeUsername(event.target.value))}
                />
              </label>

              <label className="me-field">
                <span>昵称</span>
                <input
                  value={nickname}
                  placeholder="显示给别人看的名字"
                  onChange={(event) => setNickname(event.target.value)}
                />
              </label>

              <label className="me-field">
                <span>简介</span>
                <input
                  value={bio}
                  placeholder="一句话介绍自己"
                  onChange={(event) => setBio(event.target.value)}
                />
              </label>

              {error && <div className="form-error">{error}</div>}
              {notice && <div className="form-note">{notice}</div>}

              <div className="me-actions">
                <button
                  type="button"
                  className="primary-btn"
                  disabled={saving || username.length < 3}
                  onClick={handleSave}
                >
                  {saving ? "保存中…" : "保存资料"}
                </button>
                {profile && (
                  <Link href={`/u/${profile.username}`} className="link-btn">
                    查看我的主页
                  </Link>
                )}
              </div>
            </div>

            <div className="me-stats">
              <div className="me-stat">
                <div className="me-stat-num">{total ?? "—"}</div>
                <div className="me-stat-label">篇日记</div>
              </div>
              <div className="me-stat">
                <div className="me-stat-num">{shared ?? "—"}</div>
                <div className="me-stat-label">篇公开</div>
              </div>
            </div>

            <div className="me-row">
              <span>主题</span>
              <ThemeToggle />
            </div>

            <button
              type="button"
              className="me-row me-row-btn"
              onClick={() => supabase.auth.signOut()}
            >
              退出登录
            </button>
          </>
        ) : (
          <div className="me-card">
            <div className="me-label">还没有登录</div>
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
