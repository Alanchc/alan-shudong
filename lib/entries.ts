import { supabase } from "./supabase";
import type { Entry, Mood } from "./types";

type Row = {
  id: string;
  user_id: string;
  title: string;
  content_md: string;
  entry_date: string;
  mood: Mood;
  tags: string[] | null;
  is_public: boolean;
  share_slug: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id,user_id,title,content_md,entry_date,mood,tags,is_public,share_slug,created_at,updated_at";

function toEntry(row: Row): Entry {
  return {
    id: row.id,
    title: row.title,
    contentMd: row.content_md,
    entryDate: row.entry_date,
    mood: row.mood,
    tags: row.tags ?? [],
    isPublic: row.is_public,
    shareSlug: row.share_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface EntryInput {
  title: string;
  contentMd: string;
  entryDate: string;
  mood: Mood;
  tags: string[];
}

export async function listEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("entries")
    .select(COLUMNS)
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
    })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toEntry(data as Row);
}

export async function setShare(
  id: string,
  isPublic: boolean,
): Promise<Entry> {
  const slug = isPublic
    ? Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 6)
    : null;

  const { data, error } = await supabase
    .from("entries")
    .update({ is_public: isPublic, share_slug: slug })
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
