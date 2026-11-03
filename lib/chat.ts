import { supabase } from "./supabase";
import { currentUserId, requireUserId } from "./auth";
import { listRelations, type FriendProfile } from "./friends";

const COLUMNS = "id,sender_id,receiver_id,body,created_at,recalled_at,read_at";

type Row = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  recalled_at: string | null;
  read_at: string | null;
};

export const RECALL_WINDOW_MS = 2 * 60 * 1000;

export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  createdAt: string;
  recalledAt: string | null;
  readAt: string | null;
};

export type Conversation = {
  friend: FriendProfile;
  lastMessage: ChatMessage | null;
  unread: number;
};

function toMessage(row: Row): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    body: row.body,
    createdAt: row.created_at,
    recalledAt: row.recalled_at,
    readAt: row.read_at,
  };
}

export async function listMessages(friendId: string, limit = 200): Promise<ChatMessage[]> {
  const me = await requireUserId();
  const { data, error } = await supabase
    .from("messages")
    .select(COLUMNS)
    .or(
      `and(sender_id.eq.${me},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${me})`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as Row[]).map(toMessage).reverse();
}

export async function sendMessage(friendId: string, body: string): Promise<ChatMessage> {
  const me = await requireUserId();
  const text = body.trim();
  if (!text) throw new Error("消息不能为空");
  if (text.length > 2000) throw new Error("消息太长了，最多 2000 字");

  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_id: me, receiver_id: friendId, body: text })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toMessage(data as Row);
}

export async function recallMessage(messageId: string): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("messages")
    .update({ recalled_at: new Date().toISOString() })
    .eq("id", messageId)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("超过 2 分钟，这条消息不能撤回了");
  return toMessage(data as Row);
}

export async function markConversationRead(friendId: string): Promise<void> {
  const me = await requireUserId();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("receiver_id", me)
    .eq("sender_id", friendId)
    .is("read_at", null);
  if (error) throw error;
}

export async function unreadCount(): Promise<number> {
  const me = await currentUserId();
  if (!me) return 0;
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", me)
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

export async function listConversations(): Promise<Conversation[]> {
  const me = await requireUserId();
  const [relations, result] = await Promise.all([
    listRelations(),
    supabase
      .from("messages")
      .select(COLUMNS)
      .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  if (result.error) throw result.error;

  const summaries = new Map<string, { last: ChatMessage; unread: number }>();
  (result.data as Row[]).forEach((row) => {
    const message = toMessage(row);
    const otherId = message.senderId === me ? message.receiverId : message.senderId;
    const existing = summaries.get(otherId);
    const unread = message.receiverId === me && !message.readAt ? 1 : 0;
    if (existing) {
      existing.unread += unread;
    } else {
      summaries.set(otherId, { last: message, unread });
    }
  });

  return relations
    .filter((relation) => relation.direction === "friend")
    .map((relation) => {
      const summary = summaries.get(relation.other.id);
      return {
        friend: relation.other,
        lastMessage: summary?.last ?? null,
        unread: summary?.unread ?? 0,
      };
    })
    .sort((a, b) => {
      const at = a.lastMessage ? Date.parse(a.lastMessage.createdAt) : 0;
      const bt = b.lastMessage ? Date.parse(b.lastMessage.createdAt) : 0;
      return bt - at;
    });
}

export type MessageChange = {
  eventType: "INSERT" | "UPDATE" | "DELETE" | string;
  message: ChatMessage | null;
  oldId: string | null;
};

export function subscribeMessages(handler: (change: MessageChange) => void): () => void {
  const channel = supabase
    .channel(`messages-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      (payload) => {
        const row = payload.new as Row | undefined;
        const message = row && row.id ? toMessage(row) : null;
        const oldId = (payload.old as { id?: string } | undefined)?.id ?? null;
        handler({ eventType: payload.eventType, message, oldId });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
