import { storage } from "wxt/storage";
import { bumpSettingsTs } from "./syncMeta";

export interface Streak {
  lastActive: string; // YYYY-MM-DD
  current: number;
  longest: number;
}

// Sync storage → streak follows the user across devices and survives reinstall.
const streakItem = storage.defineItem<Streak>("sync:streak", {
  fallback: { lastActive: "", current: 0, longest: 0 },
});

function todayStr(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  const ms = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) -
    Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  return Math.round(ms / 86_400_000);
}

/** Record a visit for today and return the updated streak. Idempotent per day. */
export async function recordVisit(): Promise<Streak> {
  const s = await streakItem.getValue();
  const today = todayStr();
  if (s.lastActive === today) return s; // already counted today

  let current: number;
  if (!s.lastActive) current = 1;
  else current = dayDiff(s.lastActive, today) === 1 ? s.current + 1 : 1;

  const next: Streak = { lastActive: today, current, longest: Math.max(s.longest, current) };
  await streakItem.setValue(next);
  await bumpSettingsTs();
  return next;
}

export function getStreak(): Promise<Streak> {
  return streakItem.getValue();
}

/** Restore from a sync merge without bumping the settings timestamp. */
export function setStreak(s: Streak): Promise<void> {
  return streakItem.setValue(s);
}
