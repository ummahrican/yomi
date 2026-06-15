import { storage } from "wxt/storage";
import { syncPull, syncPush } from "./api";
import { mergeDocs, type CrdtDoc } from "./crdt";
import {
  getBookmarkEntries,
  getRead,
  getUpvoted,
  setBookmarkEntries,
  unionRead,
  unionUpvoted,
} from "./db";
import { decrypt, deriveKeys, encrypt, generatePhrase, isValidPhrase, normalizePhrase } from "./crypto";
import { getMuted, setMutedRaw } from "./muted";
import { getPrefs, setPrefsRaw } from "./prefs";
import { getStreak, setStreak } from "./streak";
import { getSettingsTs, setSettingsTs } from "./syncMeta";

interface SyncState {
  enabled: boolean;
  phrase: string;
  version: number;
}

const syncState = storage.defineItem<SyncState>("local:sync", {
  fallback: { enabled: false, phrase: "", version: 0 },
});

export function getSyncState(): Promise<SyncState> {
  return syncState.getValue();
}

async function buildLocalDoc(): Promise<CrdtDoc> {
  const [bookmarks, up, rd, prefs, streak, muted, ts] = await Promise.all([
    getBookmarkEntries(),
    getUpvoted(),
    getRead(),
    getPrefs(),
    getStreak(),
    getMuted(),
    getSettingsTs(),
  ]);
  return {
    v: 1,
    bookmarks,
    upvoted: [...up],
    read: [...rd],
    settings: { ts, prefs, streak, muted },
  };
}

async function applyDoc(doc: CrdtDoc): Promise<void> {
  await setBookmarkEntries(doc.bookmarks);
  await unionUpvoted(doc.upvoted);
  await unionRead(doc.read);
  if (doc.settings) {
    const localTs = await getSettingsTs();
    if (doc.settings.ts > localTs) {
      await setPrefsRaw(doc.settings.prefs);
      await setStreak(doc.settings.streak);
      await setMutedRaw(doc.settings.muted);
      await setSettingsTs(doc.settings.ts);
    } else {
      // Even if our settings are newer, never lose a longer streak.
      const cur = await getStreak();
      if (doc.settings.streak.longest > cur.longest) {
        await setStreak({ ...cur, longest: doc.settings.streak.longest });
      }
    }
  }
}

/** Pull → merge → apply → push. Resolves a concurrent push with one retry. */
export async function syncNow(): Promise<void> {
  const st = await syncState.getValue();
  if (!st.enabled || !st.phrase) return;
  const keys = await deriveKeys(st.phrase);

  const local = await buildLocalDoc();
  const pulled = await syncPull(keys.authToken);
  const remote: CrdtDoc | null = pulled.payload
    ? (JSON.parse(await decrypt(keys.encKey, pulled.payload)) as CrdtDoc)
    : null;

  let merged = remote ? mergeDocs(local, remote) : local;
  await applyDoc(merged);

  let res = await syncPush(keys.authToken, await encrypt(keys.encKey, JSON.stringify(merged)), pulled.version);
  if (!res.ok && res.conflict && res.payload) {
    const other = JSON.parse(await decrypt(keys.encKey, res.payload)) as CrdtDoc;
    merged = mergeDocs(merged, other);
    await applyDoc(merged);
    res = await syncPush(keys.authToken, await encrypt(keys.encKey, JSON.stringify(merged)), res.version);
  }
  if (res.ok) await syncState.setValue({ ...st, version: res.version });
}

/** Turn on sync: mint a phrase, push current data, return the phrase to show once. */
export async function enableSync(): Promise<string> {
  const phrase = generatePhrase();
  await syncState.setValue({ enabled: true, phrase, version: 0 });
  await syncNow();
  return phrase;
}

/** Restore an existing account on this device from its recovery phrase. */
export async function restoreSync(phrase: string): Promise<void> {
  const p = normalizePhrase(phrase);
  if (!isValidPhrase(p)) throw new Error("That doesn't look like a valid recovery phrase.");
  await syncState.setValue({ enabled: true, phrase: p, version: 0 });
  await syncNow();
}

export async function disableSync(): Promise<void> {
  await syncState.setValue({ enabled: false, phrase: "", version: 0 });
}
