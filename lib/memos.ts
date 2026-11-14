import { supabase } from "./supabase";
import { currentUserId, requireUserId } from "./auth";

export type Memo = {
  id: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id,body,pinned,created_at,updated_at";

function toMemo(row: Row): Memo {
  return {
    id: row.id,
    body: row.body,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sortMemos(list: Memo[]): Memo[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export async function listMemos(): Promise<Memo[]> {
  const me = await currentUserId();
  if (!me) return [];

  const { data, error } = await supabase
    .from("memos")
    .select(COLUMNS)
    .eq("user_id", me)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(toMemo);
}

export async function createMemo(body: string): Promise<Memo> {
  const me = await requireUserId();

  const { data, error } = await supabase
    .from("memos")
    .insert({ user_id: me, body })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toMemo(data as Row);
}

export async function updateMemo(id: string, body: string): Promise<Memo> {
  const { data, error } = await supabase
    .from("memos")
    .update({ body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toMemo(data as Row);
}

export async function setMemoPinned(id: string, pinned: boolean): Promise<Memo> {
  const { data, error } = await supabase
    .from("memos")
    .update({ pinned })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toMemo(data as Row);
}

export async function deleteMemo(id: string): Promise<void> {
  const { error } = await supabase.from("memos").delete().eq("id", id);
  if (error) throw error;
}
