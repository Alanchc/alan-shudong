import { supabase } from "./supabase";
import { currentUserId, requireUserId } from "./auth";

export type LikeState = {
  count: number;
  liked: boolean;
};

type Row = { entry_id: string; user_id: string };

export async function loadLikeState(
  entryIds: string[],
): Promise<Map<string, LikeState>> {
  const map = new Map<string, LikeState>();
  if (entryIds.length === 0) return map;

  const me = await currentUserId();
  const { data, error } = await supabase
    .from("entry_likes")
    .select("entry_id,user_id")
    .in("entry_id", entryIds);
  if (error) throw error;

  (data as Row[]).forEach((row) => {
    const state = map.get(row.entry_id) ?? { count: 0, liked: false };
    state.count += 1;
    if (me && row.user_id === me) state.liked = true;
    map.set(row.entry_id, state);
  });

  return map;
}

export async function setLike(entryId: string, liked: boolean): Promise<boolean> {
  const me = await requireUserId();

  if (liked) {
    const { error } = await supabase
      .from("entry_likes")
      .insert({ entry_id: entryId, user_id: me });
    if (error) {
      if (error.code === "23505") return true;
      throw error;
    }
    return true;
  }

  const { error } = await supabase
    .from("entry_likes")
    .delete()
    .eq("entry_id", entryId)
    .eq("user_id", me);
  if (error) throw error;
  return false;
}
