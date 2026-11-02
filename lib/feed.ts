import { listUserEntries } from "./entries";
import { listRelations, type FriendProfile } from "./friends";
import type { Entry } from "./types";

export type FeedItem = {
  entry: Entry;
  author: FriendProfile;
};

export async function listFeed(limit = 60): Promise<FeedItem[]> {
  const relations = await listRelations();
  const friends = relations.filter((relation) => relation.direction === "friend");
  if (friends.length === 0) return [];

  const lists = await Promise.all(
    friends.map(async (friend) => {
      const entries = await listUserEntries(friend.other.id, 20);
      return entries
        .filter((entry) => entry.visibility !== "private")
        .map((entry) => ({ entry, author: friend.other }));
    }),
  );

  return lists
    .flat()
    .sort((a, b) => {
      const byDate = b.entry.entryDate.localeCompare(a.entry.entryDate);
      if (byDate !== 0) return byDate;
      return Date.parse(b.entry.createdAt) - Date.parse(a.entry.createdAt);
    })
    .slice(0, limit);
}
