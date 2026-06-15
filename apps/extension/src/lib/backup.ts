import { storage } from "wxt/storage";
import type { Prefs } from "@daily-alt/shared";
import { dumpLocal, restoreLocal } from "./db";
import { getMuted, setHidden, setMuted, type Muted } from "./muted";
import { getPrefs, setPrefs } from "./prefs";
import { getStreak, setStreak, type Streak } from "./streak";

const hiddenKey = "local:hiddenIds";

interface Backup {
  app: "yomi";
  version: 1;
  exportedAt: string;
  bookmarks: unknown[];
  upvoted: number[];
  read: number[];
  hidden: number[];
  prefs: Omit<Prefs, "deviceId">;
  streak: Streak;
  muted: Muted;
}

/** Gather everything on-device into a downloadable JSON backup. */
export async function exportBackup(): Promise<void> {
  const [local, prefs, streak, muted] = await Promise.all([
    dumpLocal(),
    getPrefs(),
    getStreak(),
    getMuted(),
  ]);
  // hidden ids live in local storage; read them via the browser storage API.
  const hiddenRaw = (await storage.getItem<number[]>(hiddenKey)) ?? [];

  const backup: Backup = {
    app: "yomi",
    version: 1,
    exportedAt: new Date().toISOString(),
    bookmarks: local.bookmarks,
    upvoted: local.upvoted,
    read: local.read,
    hidden: hiddenRaw,
    prefs,
    streak,
    muted,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yomi-backup-${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Restore from a backup file (merges into existing data). */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text) as Partial<Backup>;
  if (data.app !== "yomi") throw new Error("Not a Yomi backup file.");

  await restoreLocal({
    bookmarks: data.bookmarks as never,
    upvoted: data.upvoted,
    read: data.read,
  });
  if (data.prefs) await setPrefs(data.prefs);
  if (data.streak) await setStreak(data.streak);
  if (data.muted) await setMuted(data.muted);
  if (data.hidden) await setHidden(data.hidden);
}
