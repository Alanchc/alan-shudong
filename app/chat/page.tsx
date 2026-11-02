"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import UserAvatar, { personName } from "@/components/UserAvatar";
import { listConversations, subscribeMessages, type Conversation } from "@/lib/chat";
import { SITE_NAME } from "@/lib/site";
import { useSession } from "@/lib/useSession";

function timeLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return `${date.getMonth() + 1}-${date.getDate()}`;
}

function preview(item: Conversation) {
  if (!item.lastMessage) return "还没有聊天，打个招呼吧";
  if (item.lastMessage.recalledAt) return "撤回了一条消息";
  return item.lastMessage.body;
}

export default function ChatListPage() {
  const session = useSession();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let alive = true;

    const load = () =>
      listConversations()
        .then((list) => {
          if (!alive) return;
          setItems(list);
          setError(null);
        })
        .catch((err) => {
          if (alive) setError(err instanceof Error ? err.message : "会话加载失败");
        });

    load().finally(() => alive && setLoading(false));
    const off = subscribeMessages(() => {
      load();
    });

    return () => {
      alive = false;
      off();
    };
  }, [session]);

  return (
    <div className="chat-list-page">
      <div className="friends-inner">
        <div className="me-head">
          <span className="logo">树</span>
          <span className="brand-name">{SITE_NAME}</span>
          <Link href="/" className="link-btn" style={{ marginLeft: "auto", fontSize: 11 }}>
            返回首页
          </Link>
        </div>

        {session ? (
          <>
            {error && <div className="form-error">{error}</div>}

            <section className="friends-section chat-convos">
              <div className="friends-section-title">
                聊天 <span>{items.length}</span>
              </div>

              {loading ? (
                <div className="skeleton" style={{ height: 60, marginBottom: 10 }} />
              ) : items.length === 0 ? (
                <div className="profile-empty">
                  还没有好友可以聊天
                  <Link href="/friends" className="link-btn" style={{ marginTop: 10 }}>
                    去加好友
                  </Link>
                </div>
              ) : (
                items.map((item) => (
                  <Link
                    key={item.friend.id}
                    href={`/chat/${item.friend.username}`}
                    className="convo-row"
                  >
                    <UserAvatar person={item.friend} size={42} />
                    <div className="convo-meta">
                      <div className="convo-top">
                        <span className="convo-name">{personName(item.friend)}</span>
                        {item.lastMessage && (
                          <span className="convo-time">{timeLabel(item.lastMessage.createdAt)}</span>
                        )}
                      </div>
                      <div className="convo-preview">{preview(item)}</div>
                    </div>
                    {item.unread > 0 && <span className="convo-unread">{item.unread}</span>}
                  </Link>
                ))
              )}
            </section>
          </>
        ) : (
          <div className="me-card">
            <div className="me-label">登录后才能聊天</div>
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
