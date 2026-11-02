"use client";

import Link from "next/link";
import HomeLink from "@/components/HomeLink";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MobileNav from "@/components/MobileNav";
import UserAvatar, { personName } from "@/components/UserAvatar";
import { excerpt, formatDate, MOOD_COLOR } from "@/lib/format";
import { listFeed, type FeedItem } from "@/lib/feed";
import { SITE_NAME } from "@/lib/site";
import { useSession } from "@/lib/useSession";

export default function FeedPage() {
  const session = useSession();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    setLoading(true);
    listFeed()
      .then((list) => alive && setItems(list))
      .catch((err) =>
        alive && setError(err instanceof Error ? err.message : "动态加载失败"),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [session]);

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
                items.map(({ entry, author }) => {
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
                          <Markdown remarkPlugins={[remarkGfm]}>{entry.contentMd}</Markdown>
                        </div>
                      ) : (
                        <div className="feed-excerpt">{excerpt(entry.contentMd)}</div>
                      )}

                      <div className="feed-foot">
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
