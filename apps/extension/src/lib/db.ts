import { del, get, set } from "idb-keyval";
import type { ArticleItem } from "@daily-alt/shared";

/**
 * Local collections in IndexedDB (via idb-keyval).
 * Bookmarks are stored as LWW entries ({ item, ts, deleted }) so they merge
 * cleanly across devices via the CRDT. Upvoted/read are grow-only sets.
 */
const BOOKMARKS = "bookmarks"; // Record<id, BookmarkEntry>
const UPVOTED = "upvoted"; // number[]
const READ = "read"; // number[]

export interface BookmarkEntry {
  item: ArticleItem;
  ts: number;
  deleted: boolean;
}

async function bmMap(): Promise<Record<number, BookmarkEntry>> {
  return (await get<Record<number, BookmarkEntry>>(BOOKMARKS)) ?? {};
}

export async function getBookmarks(): Promise<ArticleItem[]> {
  const map = await bmMap();
  return Object.values(map)
    .filter((e) => !e.deleted)
    .sort((a, b) => b.ts - a.ts)
    .map((e) => e.item);
}

export async function isBookmarked(id: number): Promise<boolean> {
  const map = await bmMap();
  return !!map[id] && !map[id].deleted;
}

export async function getBookmarkIds(): Promise<Set<number>> {
  const map = await bmMap();
  return new Set(Object.entries(map).filter(([, e]) => !e.deleted).map(([id]) => Number(id)));
}

export async function toggleBookmark(article: ArticleItem): Promise<boolean> {
  const map = await bmMap();
  const cur = map[article.id];
  const added = !cur || cur.deleted;
  map[article.id] = { item: article, ts: Date.now(), deleted: !added };
  await set(BOOKMARKS, map);
  return added;
}

// Raw entries for the CRDT layer.
export const getBookmarkEntries = bmMap;
export async function setBookmarkEntries(map: Record<number, BookmarkEntry>): Promise<void> {
  await set(BOOKMARKS, map);
}

async function getNumberSet(key: string): Promise<Set<number>> {
  return new Set((await get<number[]>(key)) ?? []);
}
async function addToNumberSet(key: string, id: number): Promise<void> {
  const s = await getNumberSet(key);
  if (!s.has(id)) {
    s.add(id);
    await set(key, [...s]);
  }
}
async function unionInto(key: string, ids: number[]): Promise<void> {
  const s = await getNumberSet(key);
  let changed = false;
  for (const id of ids) if (!s.has(id)) { s.add(id); changed = true; }
  if (changed) await set(key, [...s]);
}

export const getUpvoted = () => getNumberSet(UPVOTED);
export const addUpvoted = (id: number) => addToNumberSet(UPVOTED, id);
export const getRead = () => getNumberSet(READ);
export const addRead = (id: number) => addToNumberSet(READ, id);
export const unionUpvoted = (ids: number[]) => unionInto(UPVOTED, ids);
export const unionRead = (ids: number[]) => unionInto(READ, ids);

export async function clearAllLocalData(): Promise<void> {
  await Promise.all([del(BOOKMARKS), del(UPVOTED), del(READ)]);
}

/** Snapshot of live collections, for the human-readable Export file. */
export async function dumpLocal(): Promise<{
  bookmarks: ArticleItem[];
  upvoted: number[];
  read: number[];
}> {
  return {
    bookmarks: await getBookmarks(),
    upvoted: [...(await getNumberSet(UPVOTED))],
    read: [...(await getNumberSet(READ))],
  };
}

/** Restore collections from a backup (merges into existing). */
export async function restoreLocal(data: {
  bookmarks?: ArticleItem[];
  upvoted?: number[];
  read?: number[];
}): Promise<void> {
  if (data.bookmarks?.length) {
    const map = await bmMap();
    for (const a of data.bookmarks) {
      if (!map[a.id] || map[a.id].deleted) map[a.id] = { item: a, ts: Date.now(), deleted: false };
    }
    await set(BOOKMARKS, map);
  }
  if (data.upvoted?.length) await unionInto(UPVOTED, data.upvoted);
  if (data.read?.length) await unionInto(READ, data.read);
}
