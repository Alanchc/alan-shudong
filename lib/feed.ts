import { listEntriesByUsers } from "./entries";
import { listRelations, type FriendProfile } from "./friends";
import { loadLikeState } from "./likes";
import type { Entry } from "./types";

export type FeedItem = {
  entry: Entry;
  author: FriendProfile;
  likeCount: number;
  liked: boolean;
};

export async function listFeed(limit = 60): Promise<FeedItem[]> {
  const relations = await listRelations();
  const friends = relations.filter((relation) => relation.direction === "friend");
  if (friends.length === 0) return [];

  const entries = await listEntriesByUsers(friends.map((friend) => friend.other.id), 240);

  const byAuthor = new Map<string, Entry[]>();
  entries.forEach((entry) => {
    const list = byAuthor.get(entry.userId) ?? [];
    list.push(entry);
    byAuthor.set(entry.userId, list);
  });

  const items: FeedItem[] = friends.flatMap((friend) =>
    (byAuthor.get(friend.other.id) ?? [])
      .slice(0, 20)
      .map((entry) => ({ entry, author: friend.other, likeCount: 0, liked: false })),
  );

  const page = items
    .sort((a, b) => {
      const byDate = b.entry.entryDate.localeCompare(a.entry.entryDate);
      if (byDate !== 0) return byDate;
      return Date.parse(b.entry.createdAt) - Date.parse(a.entry.createdAt);
    })
    .slice(0, limit);

  let states = new Map<string, { count: number; liked: boolean }>();
  try {
    states = await loadLikeState(page.map((item) => item.entry.id));
  } catch {
    // 点赞表尚未创建时，动态列表仍可正常展示
  }

  return page.map((item) => {
    const state = states.get(item.entry.id);
    return { ...item, likeCount: state?.count ?? 0, liked: state?.liked ?? false };
  });
}
