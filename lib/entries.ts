import { supabase } from "./supabase";
import type { Entry, Mood, Visibility } from "./types";

type Row = {
  id: string;
  user_id: string;
  title: string;
  content_md: string;
  entry_date: string;
  mood: Mood;
  tags: string[] | null;
  visibility: Visibility;
  is_public: boolean;
  share_slug: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id,user_id,title,content_md,entry_date,mood,tags,visibility,is_public,share_slug,created_at,updated_at";

function toEntry(row: Row): Entry {
  return {
    id: row.id,
    title: row.title,
    contentMd: row.content_md,
    entryDate: row.entry_date,
    mood: row.mood,
    tags: row.tags ?? [],
    visibility: row.visibility,
    isPublic: row.is_public,
    shareSlug: row.share_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function makeSlug(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export interface EntryInput {
  title: string;
  contentMd: string;
  entryDate: string;
  mood: Mood;
  tags: string[];
  visibility: Visibility;
}

export async function listEntries(): Promise<Entry[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("entries")
    .select(COLUMNS)
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(toEntry);
}

export async function getEntry(id: string): Promise<Entry | null> {
  const { data, error } = await supabase
    .from("entries")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toEntry(data as Row) : null;
}

export async function createEntry(input: EntryInput): Promise<Entry> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("请先登录");

  const { data, error } = await supabase
    .from("entries")
    .insert({
      user_id: userData.user.id,
      title: input.title,
      content_md: input.contentMd,
      entry_date: input.entryDate,
      mood: input.mood,
      tags: input.tags,
      visibility: input.visibility,
      share_slug: input.visibility === "public" ? makeSlug() : null,
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toEntry(data as Row);
}

export async function updateEntry(
  id: string,
  input: EntryInput,
): Promise<Entry> {
  const { data, error } = await supabase
    .from("entries")
    .update({
      title: input.title,
      content_md: input.contentMd,
      entry_date: input.entryDate,
      mood: input.mood,
      tags: input.tags,
      visibility: input.visibility,
    })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw error;

  let entry = toEntry(data as Row);
  if (entry.visibility === "public" && !entry.shareSlug) {
    const { data: updated, error: slugError } = await supabase
      .from("entries")
      .update({ share_slug: makeSlug() })
      .eq("id", id)
      .select(COLUMNS)
      .single();
    if (slugError) throw slugError;
    entry = toEntry(updated as Row);
  }
  return entry;
}

export async function setVisibility(
  id: string,
  visibility: Visibility,
): Promise<Entry> {
  const { data: current, error: readError } = await supabase
    .from("entries")
    .select("share_slug")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;

  const slug = current?.share_slug ?? (visibility === "public" ? makeSlug() : null);

  const { data, error } = await supabase
    .from("entries")
    .update({ visibility, share_slug: slug })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toEntry(data as Row);
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) throw error;
}

export async function listUserEntries(userId: string, limit = 50): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("entries")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as Row[]).map(toEntry);
}

export async function getPublicEntry(slug: string): Promise<Entry | null> {
  const { data, error } = await supabase
    .from("entries")
    .select(COLUMNS)
    .eq("share_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (error) throw error;
  return data ? toEntry(data as Row) : null;
}
