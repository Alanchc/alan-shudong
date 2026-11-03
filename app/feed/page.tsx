"use client";

import Link from "next/link";
import HomeLink from "@/components/HomeLink";
import { useEffect, useState } from "react";
import MarkdownBody from "@/components/MarkdownBody";
import MobileNav from "@/components/MobileNav";
import UserAvatar, { personName } from "@/components/UserAvatar";
import { excerpt, formatDate, MOOD_COLOR } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { listFeed, type FeedItem } from "@/lib/feed";
import { setLike } from "@/lib/likes";
import { SITE_NAME } from "@/lib/site";
import { useSession } from "@/lib/useSession";

export default function FeedPage() {
  const session = useSession();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [liking, setLiking] = useState<string[]>([]);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    setLoading(true);
    listFeed()
      .then((list) => alive && setItems(list))
      .catch((err) =>
        alive && setError(errorMessage(err, "动态加载失败")),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [session]);

  async function handleLike(entryId: string) {
    if (liking.includes(entryId)) return;
    const current = items.find((item) => item.entry.id === entryId);
    if (!current) return;
    const next = !current.liked;

    setLiking((prev) => [...prev, entryId]);
    setItems((prev) =>
      prev.map((item) =>
        item.entry.id === entryId
          ? {
              ...item,
              liked: next,
              likeCount: Math.max(0, item.likeCount + (next ? 1 : -1)),
            }
          : item,
      ),
    );

    try {
      const result = await setLike(entryId, next);
      if (result !== next) {
        setItems((prev) =>
          prev.map((item) =>
            item.entry.id === entryId
              ? {
                  ...item,
                  liked: result,
                  likeCount: Math.max(0, item.likeCount + (result ? 1 : -1)),
                }
              : item,
          ),
        );
      }
    } catch (err) {
      setItems((prev) =>
        prev.map((item) =>
          item.entry.id === entryId
            ? {
                ...item,
                liked: !next,
                likeCount: Math.max(0, item.likeCount + (next ? -1 : 1)),
              }
            : item,
        ),
      );
      setError(errorMessage(err, "点赞失败，请稍后重试"));
    } finally {
      setLiking((prev) => prev.filter((id) => id !== entryId));
    }
  }

  return (
    <div className="chat-list-page">
      <div className="friends-inner">
        <div className="me-head">
          <span className="logo">树</span>
          <span className="brand-name">{SITE_NAME}</span>
          <HomeLink style={{ marginLeft: "auto" }} />
        </div>

        {session ? (
          <>
            {error && <div className="form-error">{error}</div>}

            <section className="friends-section">
              <div className="friends-section-title">
                好友动态 <span>{items.length}</span>
              </div>

              {loading ? (
                <div className="skeleton" style={{ height: 140, marginBottom: 10 }} />
              ) : items.length === 0 ? (
                <div className="profile-empty">
                  还没有好友动态，先加几个好友吧
                  <Link href="/friends" className="link-btn" style={{ marginTop: 10 }}>
                    去加好友
                  </Link>
                </div>
              ) : (
                items.map(({ entry, author, likeCount, liked }) => {
                  const open = expanded === entry.id;
                  return (
                    <article key={entry.id} className="feed-card">
                      <div className="feed-head">
                        <Link href={`/u/${author.username}`} className="feed-author">
                          <UserAvatar person={author} size={32} />
                          <span className="feed-author-name">{personName(author)}</span>
                        </Link>
                        <span className="feed-date">{formatDate(entry.entryDate)}</span>
                        <span className={`profile-vis ${entry.visibility}`}>
                          {entry.visibility === "friends" ? "仅好友" : "公开"}
                        </span>
                      </div>

                      <h3 className="feed-title">{entry.title || "无标题"}</h3>

                      <div className="feed-meta">
                        <span className="pill">
                          <i
                            className="mood-dot"
                            style={{ background: MOOD_COLOR[entry.mood] }}
                          />
                          {entry.mood}
                        </span>
                        {entry.tags.map((tag) => (
                          <span key={tag} className="chip">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {open ? (
                        <div className="prose feed-body">
                          <MarkdownBody>{entry.contentMd}</MarkdownBody>
                        </div>
                      ) : (
                        <div className="feed-excerpt">{excerpt(entry.contentMd)}</div>
                      )}

                      <div className="feed-foot">
                        <button
                          type="button"
                          className={`like-btn${liked ? " liked" : ""}`}
                          aria-pressed={liked}
                          aria-label={liked ? "取消点赞" : "点赞"}
                          disabled={liking.includes(entry.id)}
                          onClick={() => handleLike(entry.id)}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill={liked ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M12 20.2s-7.4-4.6-7.4-9.4a4.2 4.2 0 0 1 7.4-2.8 4.2 4.2 0 0 1 7.4 2.8c0 4.8-7.4 9.4-7.4 9.4z" />
                          </svg>
                          <span>{likeCount > 0 ? likeCount : "点赞"}</span>
                        </button>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setExpanded(open ? null : entry.id)}
                        >
                          {open ? "收起" : "展开全文"}
                        </button>
                        {entry.visibility === "public" && entry.shareSlug && (
                          <Link href={`/s/${entry.shareSlug}`} className="link-btn">
                            分享页 →
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          </>
        ) : (
          <div className="me-card">
            <div className="me-label">登录后才能看好友动态</div>
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
