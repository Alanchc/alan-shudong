import { supabase } from "./supabase";
import { currentUserId, requireUserId } from "./auth";

type Row = {
  id: string;
  username: string;
  nickname: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
};

const COLUMNS = "id,username,nickname,bio,avatar_url,created_at";

export type Profile = {
  id: string;
  username: string;
  nickname: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

function toProfile(row: Row): Profile {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export async function getMyProfile(): Promise<Profile | null> {
  const id = await currentUserId();
  if (!id) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toProfile(data as Row) : null;
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(COLUMNS)
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data ? toProfile(data as Row) : null;
}

export interface ProfileInput {
  username: string;
  nickname: string;
  bio: string;
  avatarUrl: string | null;
}

export async function saveProfile(input: ProfileInput): Promise<Profile> {
  const id = await requireUserId();

  const username = normalizeUsername(input.username);
  if (username.length < 3) throw new Error("用户名至少 3 位，只能用字母、数字、下划线");

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id,
        username,
        nickname: input.nickname.trim() || null,
        bio: input.bio.trim() || null,
        avatar_url: input.avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select(COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("这个用户名已经被占用了");
    if (error.code === "23514") throw new Error("用户名格式不对：3–20 位小写字母、数字或下划线");
    throw error;
  }
  return toProfile(data as Row);
}

export async function uploadAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("只能上传图片文件");
  if (file.size > 5 * 1024 * 1024) throw new Error("头像不能超过 5MB");

  const id = await requireUserId();

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${id}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
