"use client";

import Link from "next/link";
import HomeLink from "@/components/HomeLink";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import UserAvatar, { personName } from "@/components/UserAvatar";
import {
  listMessages,
  markConversationRead,
  recallMessage,
  RECALL_WINDOW_MS,
  sendMessage,
  subscribeMessages,
  type ChatMessage,
} from "@/lib/chat";
import { formatTime } from "@/lib/format";
import { getRelationWith, type Relation } from "@/lib/friends";
import { getProfileByHandle, looksLikeUserId, type Profile } from "@/lib/profiles";
import { useSession } from "@/lib/useSession";

function placeholderProfile(id: string): Profile {
  return { id, username: "", nickname: "对方", bio: null, avatarUrl: null, createdAt: "" };
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "今天";
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

export default function ChatRoomPage() {
  const params = useParams<{ username: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const session = useSession();

  const [friend, setFriend] = useState<Profile | null>(null);
  const [relation, setRelation] = useState<Relation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [ready, setReady] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const meId = session?.user.id ?? null;
  const isFriend = relation?.direction === "friend";

  useEffect(() => {
    if (!username || session === undefined) return;
    let alive = true;

    getProfileByHandle(username)
      .then((found) => {
        if (!alive) return;
        const target = found ?? (looksLikeUserId(username) ? placeholderProfile(username) : null);
        if (!target) {
          setNotFound(true);
          return;
        }
        setFriend(target);
      })
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setReady(true));

    return () => {
      alive = false;
    };
  }, [username, session]);

  useEffect(() => {
    if (!friend || session === undefined) return;
    if (!session || session.user.id === friend.id) {
      setRelation(null);
      return;
    }
    let alive = true;
    getRelationWith(friend.id)
      .then((rel) => alive && setRelation(rel))
      .catch(() => alive && setRelation(null));
    return () => {
      alive = false;
    };
  }, [friend, session]);

  // 消息加载不再依赖好友关系：关系行缺失时也要能看到历史消息，避免聊天框空白
  useEffect(() => {
    if (!friend || !meId || meId === friend.id) return;
    let alive = true;
    setLoading(true);
    listMessages(friend.id)
      .then((list) => {
        if (!alive) return;
        setMessages(list);
        markConversationRead(friend.id).catch(() => {});
      })
      .catch((err) => alive && setError(err instanceof Error ? err.message : "消息加载失败"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [friend, meId]);

  useEffect(() => {
    if (!friend || !meId) return;
    const off = subscribeMessages((change) => {
      const message = change.message;
      if (!message) return;
      const involved =
        (message.senderId === meId && message.receiverId === friend.id) ||
        (message.senderId === friend.id && message.receiverId === meId);
      if (!involved) return;

      if (change.eventType === "INSERT") {
        setMessages((prev) =>
          prev.some((item) => item.id === message.id) ? prev : [...prev, message],
        );
        if (message.receiverId === meId) markConversationRead(friend.id).catch(() => {});
      } else if (change.eventType === "UPDATE") {
        setMessages((prev) => prev.map((item) => (item.id === message.id ? message : item)));
      } else if (change.eventType === "DELETE" && change.oldId) {
        setMessages((prev) => prev.filter((item) => item.id !== change.oldId));
      }
    });
    return off;
  }, [friend, meId]);

  useEffect(() => {
    if (!friend || !meId) return;
    let alive = true;

    const sync = () => {
      if (document.visibilityState !== "visible") return;
      listMessages(friend.id)
        .then((list) => {
          if (!alive) return;
          setMessages(list);
          if (list.some((item) => item.receiverId === meId && !item.readAt)) {
            markConversationRead(friend.id).catch(() => {});
          }
        })
        .catch(() => {});
    };

    const timer = window.setInterval(sync, 6000);
    document.addEventListener("visibilitychange", sync);

    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [friend, meId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleSend() {
    if (!friend || !input.trim() || sending) return;
    setSending(true);
    setError(null);
    const text = input;
    setInput("");
    try {
      const message = await sendMessage(friend.id, text);
      setMessages((prev) =>
        prev.some((item) => item.id === message.id) ? prev : [...prev, message],
      );
    } catch (err) {
      setInput(text);
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
    }
  }

  async function handleRecall(message: ChatMessage) {
    setError(null);
    try {
      const updated = await recallMessage(message.id);
      setMessages((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "撤回失败");
    }
  }

  if (session === null) {
    return (
      <div className="chat-room">
        <div className="chat-body">
          <div className="profile-empty">
            登录后才能聊天
            <Link href="/login" className="primary-btn" style={{ marginTop: 12 }}>
              去登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="chat-room">
        <div className="chat-body">
          <div className="profile-empty">
            没有找到 @{username}
            <Link href="/chat" className="link-btn" style={{ marginTop: 12 }}>
              返回消息列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!ready || !friend) {
    return (
      <div className="chat-room">
        <div className="chat-body">
          <div className="skeleton" style={{ height: 120 }} />
        </div>
      </div>
    );
  }

  if (meId === friend.id) {
    return (
      <div className="chat-room">
        <div className="chat-body">
          <div className="profile-empty">
            这是你自己的主页，不能和自己聊天
            <Link href="/me" className="link-btn" style={{ marginTop: 12 }}>
              返回我的
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isFriend) {
    return (
      <div className="chat-room">
        <div className="chat-head">
          <Link href="/chat" className="link-btn">
            返回
          </Link>
          <div className="chat-head-name">{personName(friend)}</div>
          <HomeLink style={{ marginLeft: "auto" }} />
        </div>
        <div className="chat-body">
          {loading ? (
            <div className="skeleton" style={{ height: 120 }} />
          ) : messages.length === 0 ? (
            <div className="profile-empty">
              你们还不是好友，先加好友才能聊天
              {friend.username && (
                <Link href={`/u/${friend.username}`} className="primary-btn" style={{ marginTop: 12 }}>
                  去对方主页
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="chat-day">你们还不是好友，以下是历史消息</div>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-msg ${message.senderId === meId ? "me" : ""}`}
                >
                  <div className="chat-bubble-wrap">
                    <div className="chat-bubble">
                      {message.recalledAt ? "该消息已撤回" : message.body}
                    </div>
                    <div className="chat-meta">
                      <span>{formatTime(message.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-room">
      <div className="chat-head">
        <Link href="/chat" className="link-btn">
          返回
        </Link>
        {friend.username ? (
          <Link href={`/u/${friend.username}`} className="chat-head-person">
            <UserAvatar person={friend} size={30} />
            <span>{personName(friend)}</span>
          </Link>
        ) : (
          <div className="chat-head-person">
            <UserAvatar person={friend} size={30} />
            <span>{personName(friend)}</span>
          </div>
        )}
        <HomeLink style={{ marginLeft: "auto" }} />
      </div>

      <div className="chat-body">
        {loading ? (
          <div className="skeleton" style={{ height: 120 }} />
        ) : messages.length === 0 ? (
          <div className="profile-empty">还没有消息，说点什么吧</div>
        ) : (
          messages.map((message, index) => {
            const mine = message.senderId === meId;
            const prev = index > 0 ? messages[index - 1] : null;
            const showDay =
              !prev || dayLabel(prev.createdAt) !== dayLabel(message.createdAt);
            const canRecall =
              mine &&
              !message.recalledAt &&
              Date.now() - Date.parse(message.createdAt) < RECALL_WINDOW_MS;

            return (
              <div key={message.id}>
                {showDay && <div className="chat-day">{dayLabel(message.createdAt)}</div>}
                {message.recalledAt ? (
                  <div className="chat-recalled">
                    {mine ? "你撤回了一条消息" : "对方撤回了一条消息"}
                  </div>
                ) : (
                  <div className={`chat-msg ${mine ? "me" : ""}`}>
                    {!mine && <UserAvatar person={friend} size={28} />}
                    <div className="chat-bubble-wrap">
                      <div className="chat-bubble">{message.body}</div>
                      <div className="chat-meta">
                        {canRecall && (
                          <button
                            type="button"
                            className="chat-recall"
                            onClick={() => handleRecall(message)}
                          >
                            撤回
                          </button>
                        )}
                        <span>{formatTime(message.createdAt)}</span>
                        {mine && message.readAt && <span>已读</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className="chat-error">{error}</div>}

      <div className="chat-input-bar">
        <textarea
          value={input}
          placeholder={`发消息给 ${personName(friend)}…`}
          rows={1}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          type="button"
          className="send-btn"
          disabled={sending || !input.trim()}
          onClick={handleSend}
        >
          {sending ? "发送中" : "发送"}
        </button>
      </div>
    </div>
  );
}
