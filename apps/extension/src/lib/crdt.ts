import type { Prefs } from "@daily-alt/shared";
import type { BookmarkEntry } from "./db";
import type { Muted } from "./muted";
import type { Streak } from "./streak";

type PrefsValue = Omit<Prefs, "deviceId">;

export interface Settings {
  ts: number;
  prefs: PrefsValue;
  streak: Streak;
  muted: Muted;
}

/**
 * A small state-based CRDT for one user's data across devices:
 *  - bookmarks: LWW-element-set ({ item, ts, deleted }) — last write per id wins.
 *  - upvoted / read: grow-only sets — merge = union (these are never un-set).
 *  - settings: a LWW register bundle (prefs + streak + muted), newest ts wins,
 *    with streak.longest kept as the max so a streak is never lost.
 * Merge is commutative, associative and idempotent → order-independent sync.
 */
export interface CrdtDoc {
  v: 1;
  bookmarks: Record<string, BookmarkEntry>;
  upvoted: number[];
  read: number[];
  settings: Settings | null;
}

function mergeSettings(a: Settings | null, b: Settings | null): Settings | null {
  if (!a) return b;
  if (!b) return a;
  const base = a.ts >= b.ts ? a : b;
  const laterStreak = a.streak.lastActive >= b.streak.lastActive ? a.streak : b.streak;
  return {
    ...base,
    streak: {
      lastActive: laterStreak.lastActive,
      current: laterStreak.current,
      longest: Math.max(a.streak.longest, b.streak.longest),
    },
  };
}

export function mergeDocs(a: CrdtDoc, b: CrdtDoc): CrdtDoc {
  const bookmarks: Record<string, BookmarkEntry> = { ...a.bookmarks };
  for (const [id, e] of Object.entries(b.bookmarks)) {
    const cur = bookmarks[id];
    if (!cur || e.ts > cur.ts) bookmarks[id] = e;
  }
  return {
    v: 1,
    bookmarks,
    upvoted: [...new Set([...a.upvoted, ...b.upvoted])],
    read: [...new Set([...a.read, ...b.read])],
    settings: mergeSettings(a.settings, b.settings),
  };
}
