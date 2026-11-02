import { supabase } from "./supabase";
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

async function requireMe(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("请先登录");
  return data.user.id;
}

async function loadProfiles(ids: string[]): Promise<Map<string, FriendProfile>> {
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

  const me = await requireMe();
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
  const me = await requireMe();
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
  const profiles = await loadProfiles(otherIds);

  return rows.map((row) => {
    const otherId = row.requester_id === me ? row.addressee_id : row.requester_id;
    const other = profiles.get(otherId) ?? {
      id: otherId,
      username: "unknown",
      nickname: null,
      bio: null,
      avatarUrl: null,
    };
    return toRelation(row, me, other);
  });
}

export async function getRelationWith(userId: string): Promise<Relation | null> {
  const me = await requireMe();
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
  const profiles = await loadProfiles([otherId]);
  const other = profiles.get(otherId) ?? {
    id: otherId,
    username: "unknown",
    nickname: null,
    bio: null,
    avatarUrl: null,
  };
  return toRelation(row, me, other);
}

export async function sendFriendRequest(userId: string): Promise<void> {
  const me = await requireMe();
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
}

export async function acceptRequest(relationId: string): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", relationId);
  if (error) throw error;
}

export async function removeRelation(relationId: string): Promise<void> {
  const { error } = await supabase.from("friendships").delete().eq("id", relationId);
  if (error) throw error;
}
