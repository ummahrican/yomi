import { storage } from "wxt/storage";
import { bumpSettingsTs } from "./syncMeta";

export interface Muted {
  tags: string[];
  sources: string[]; // source slugs
}

// Muted tags/sources sync across devices; sent to the API as per-request filters
// (the server stores no profile). Hidden article ids stay local (can grow large).
const mutedItem = storage.defineItem<Muted>("sync:muted", {
  fallback: { tags: [], sources: [] },
});
const hiddenItem = storage.defineItem<number[]>("local:hiddenIds", { fallback: [] });

export function getMuted(): Promise<Muted> {
  return mutedItem.getValue();
}
export async function setMuted(m: Muted): Promise<void> {
  await mutedItem.setValue(m);
  await bumpSettingsTs();
}

/** Restore from a sync merge without bumping the settings timestamp. */
export function setMutedRaw(m: Muted): Promise<void> {
  return mutedItem.setValue(m);
}
export function watchMuted(cb: (m: Muted) => void): () => void {
  return mutedItem.watch((v) => v && cb(v));
}

async function toggle(key: keyof Muted, value: string, on: boolean): Promise<Muted> {
  const m = await mutedItem.getValue();
  const set = new Set(m[key]);
  on ? set.add(value) : set.delete(value);
  const next = { ...m, [key]: [...set] };
  await mutedItem.setValue(next);
  await bumpSettingsTs();
  return next;
}

export const muteTag = (t: string) => toggle("tags", t, true);
export const unmuteTag = (t: string) => toggle("tags", t, false);
export const muteSource = (s: string) => toggle("sources", s, true);
export const unmuteSource = (s: string) => toggle("sources", s, false);

export async function getHidden(): Promise<Set<number>> {
  return new Set(await hiddenItem.getValue());
}
export async function addHidden(id: number): Promise<void> {
  const cur = await hiddenItem.getValue();
  if (!cur.includes(id)) await hiddenItem.setValue([...cur, id]);
}
export function setHidden(ids: number[]): Promise<void> {
  return hiddenItem.setValue(ids);
}
export function clearMutedAndHidden(): Promise<void> {
  return Promise.all([mutedItem.setValue({ tags: [], sources: [] }), hiddenItem.setValue([])]).then(
    () => {},
  );
}
