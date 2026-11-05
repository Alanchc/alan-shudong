import { supabase } from "./supabase";
import { currentUserId, requireUserId } from "./auth";
import { emitEvent, EVENTS } from "./events";

type AnnouncementRow = {
  id: string;
  author_id: string;
  title: string | null;
  body: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
};

export type Announcement = {
  id: string;
  title: string | null;
  body: string;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
};

export type AdminMember = {
  id: string;
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
  grantedAt: string;
};

async function profilesByIds(ids: string[]): Promise<Map<string, ProfileRow>> {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,username,nickname,avatar_url")
    .in("id", unique);
  if (error) return new Map();

  const map = new Map<string, ProfileRow>();
  (data as ProfileRow[]).forEach((row) => map.set(row.id, row));
  return map;
}

export async function listAnnouncements(): Promise<Announcement[]> {
  await requireUserId();

  const { data, error } = await supabase
    .from("announcements")
    .select("id,author_id,title,body,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  const rows = (data ?? []) as AnnouncementRow[];
  const profiles = await profilesByIds(rows.map((row) => row.author_id));

  return rows.map((row) => {
    const profile = profiles.get(row.author_id);
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.created_at,
      authorName: profile ? profile.nickname || profile.username : "管理员",
      authorAvatarUrl: profile?.avatar_url ?? null,
    };
  });
}

function seenKey(userId: string) {
  return `notices:seen:${userId}`;
}

export function readSeenAt(userId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(seenKey(userId));
}

export async function unreadAnnouncementsCount(): Promise<number> {
  const me = await currentUserId();
  if (!me || typeof window === "undefined") return 0;

  const seen = window.localStorage.getItem(seenKey(me));
  let query = supabase.from("announcements").select("id", { count: "exact", head: true });
  if (seen) query = query.gt("created_at", seen);

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export async function markAnnouncementsRead(latestCreatedAt?: string): Promise<void> {
  const me = await currentUserId();
  if (!me || typeof window === "undefined") return;

  const key = seenKey(me);
  const prev = window.localStorage.getItem(key);
  if (latestCreatedAt) {
    if (prev === latestCreatedAt) return;
    window.localStorage.setItem(key, latestCreatedAt);
  } else {
    if (prev) return;
    window.localStorage.setItem(key, new Date().toISOString());
  }
  emitEvent(EVENTS.notices);
}

export async function createAnnouncement(title: string, body: string) {
  const me = await requireUserId();
  const cleanTitle = title.trim();
  const cleanBody = body.trim();
  if (!cleanBody) throw new Error("通知内容不能为空");

  const { error } = await supabase.from("announcements").insert({
    author_id: me,
    title: cleanTitle || null,
    body: cleanBody,
  });
  if (error) throw error;
}

export async function deleteAnnouncement(id: string) {
  await requireUserId();

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const me = await currentUserId();
  if (!me) return false;

  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", me)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function listAdmins(): Promise<AdminMember[]> {
  await requireUserId();

  const { data, error } = await supabase
    .from("admins")
    .select("user_id,created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as { user_id: string; created_at: string }[];
  const profiles = await profilesByIds(rows.map((row) => row.user_id));

  return rows.map((row) => {
    const profile = profiles.get(row.user_id);
    return {
      id: row.user_id,
      username: profile?.username ?? "unknown",
      nickname: profile?.nickname ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      grantedAt: row.created_at,
    };
  });
}

export async function grantAdmin(userId: string) {
  const me = await requireUserId();

  const { error } = await supabase
    .from("admins")
    .insert({ user_id: userId, granted_by: me });
  if (error) throw error;
}

export async function revokeAdmin(userId: string) {
  await requireUserId();

  const { error } = await supabase.from("admins").delete().eq("user_id", userId);
  if (error) throw error;
}
