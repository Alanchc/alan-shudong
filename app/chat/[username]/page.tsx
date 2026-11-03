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
import { getProfileByUsername, type Profile } from "@/lib/profiles";
import { useSession } from "@/lib/useSession";

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

    getProfileByUsername(username)
      .then(async (found) => {
        if (!alive) return;
        if (!found) {
          setNotFound(true);
          return;
        }
        setFriend(found);
        if (!session || session.user.id === found.id) {
          setReady(true);
          return;
        }
        const rel = await getRelationWith(found.id);
        if (alive) {
          setRelation(rel);
          setReady(true);
        }
      })
      .catch(() => alive && setNotFound(true));

    return () => {
      alive = false;
    };
  }, [username, session]);

  useEffect(() => {
    if (!friend || !isFriend) return;
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
  }, [friend, isFriend]);

  useEffect(() => {
    if (!friend || !isFriend || !meId) return;
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
  }, [friend, isFriend, meId]);

  useEffect(() => {
    if (!friend || !isFriend || !meId) return;
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
  }, [friend, isFriend, meId]);

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
          <div className="chat-head-name">@{friend.username}</div>
          <HomeLink style={{ marginLeft: "auto" }} />
        </div>
        <div className="chat-body">
          <div className="profile-empty">
            你们还不是好友，先加好友才能聊天
            <Link href={`/u/${friend.username}`} className="primary-btn" style={{ marginTop: 12 }}>
              去对方主页
            </Link>
          </div>
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
        <Link href={`/u/${friend.username}`} className="chat-head-person">
          <UserAvatar person={friend} size={30} />
          <span>{personName(friend)}</span>
        </Link>
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
