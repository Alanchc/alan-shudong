import { supabase } from "./supabase";
import { currentUserId, requireUserId } from "./auth";
import { emitEvent, EVENTS } from "./events";
import { normalizeUsername } from "./profiles";

type ProfileRow = {
  id: string;
  username: string;
  nickname: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
};

const PROFILE_COLUMNS = "id,username,nickname,bio,avatar_url";
const FRIENDSHIP_COLUMNS = "id,requester_id,addressee_id,status,created_at";

export type FriendProfile = {
  id: string;
  username: string;
  nickname: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

export type Relation = {
  id: string;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing" | "friend";
  other: FriendProfile;
  createdAt: string;
};

function toProfile(row: ProfileRow): FriendProfile {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    bio: row.bio,
    avatarUrl: row.avatar_url,
  };
}

function toRelation(row: FriendshipRow, me: string, other: FriendProfile): Relation {
  const incoming = row.addressee_id === me;
  return {
    id: row.id,
    status: row.status,
    direction: row.status === "accepted" ? "friend" : incoming ? "incoming" : "outgoing",
    other,
    createdAt: row.created_at,
  };
}

export async function loadProfilesByIds(ids: string[]): Promise<Map<string, FriendProfile>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .in("id", ids);
  if (error) throw error;
  const map = new Map<string, FriendProfile>();
  (data as ProfileRow[]).forEach((row) => map.set(row.id, toProfile(row)));
  return map;
}

export async function searchProfiles(query: string): Promise<FriendProfile[]> {
  const keyword = normalizeUsername(query);
  if (!keyword) return [];

  const me = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .ilike("username", `${keyword}%`)
    .neq("id", me)
    .order("username", { ascending: true })
    .limit(8);
  if (error) throw error;
  return (data as ProfileRow[]).map(toProfile);
}

export async function listRelations(): Promise<Relation[]> {
  const me = await requireUserId();
  const { data, error } = await supabase
    .from("friendships")
    .select(FRIENDSHIP_COLUMNS)
    .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = data as FriendshipRow[];
  const otherIds = Array.from(
    new Set(rows.map((row) => (row.requester_id === me ? row.addressee_id : row.requester_id))),
  );
  const profiles = await loadProfilesByIds(otherIds);

  return rows.map((row) => {
    const otherId = row.requester_id === me ? row.addressee_id : row.requester_id;
    const other = profiles.get(otherId) ?? fallbackProfile(otherId);
    return toRelation(row, me, other);
  });
}

// 资料行缺失时（例如注册后还没填资料）用 id 兜底，保证聊天和主页链接仍然可用
export function fallbackProfile(id: string): FriendProfile {
  return {
    id,
    username: id,
    nickname: "对方",
    bio: null,
    avatarUrl: null,
  };
}

export async function getRelationWith(userId: string): Promise<Relation | null> {
  const me = await requireUserId();
  const { data, error } = await supabase
    .from("friendships")
    .select(FRIENDSHIP_COLUMNS)
    .or(
      `and(requester_id.eq.${me},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${me})`,
    )
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as FriendshipRow;
  const otherId = row.requester_id === me ? row.addressee_id : row.requester_id;
  const profiles = await loadProfilesByIds([otherId]);
  const other = profiles.get(otherId) ?? fallbackProfile(otherId);
  return toRelation(row, me, other);
}

export async function pendingRequestCount(): Promise<number> {
  const me = await currentUserId();
  if (!me) return 0;

  const { count, error } = await supabase
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("addressee_id", me)
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}

export async function sendFriendRequest(userId: string): Promise<void> {
  const me = await requireUserId();
  if (me === userId) throw new Error("不能加自己为好友");

  const { error } = await supabase.from("friendships").insert({
    requester_id: me,
    addressee_id: userId,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") throw new Error("已经申请过或已经是好友了");
    throw error;
  }
  emitEvent(EVENTS.friends);
}

export async function acceptRequest(relationId: string): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", relationId);
  if (error) throw error;
  emitEvent(EVENTS.friends);
}

export async function removeRelation(relationId: string): Promise<void> {
  const { error } = await supabase.from("friendships").delete().eq("id", relationId);
  if (error) throw error;
  emitEvent(EVENTS.friends);
}
