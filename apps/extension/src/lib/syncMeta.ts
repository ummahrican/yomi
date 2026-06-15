import { storage } from "wxt/storage";

// Last-modified timestamp for the "settings bundle" (prefs + streak + muted),
// used by the CRDT to last-write-wins-merge settings across devices.
const settingsTs = storage.defineItem<number>("sync:settingsTs", { fallback: 0 });

export function getSettingsTs(): Promise<number> {
  return settingsTs.getValue();
}
export function setSettingsTs(ts: number): Promise<void> {
  return settingsTs.setValue(ts);
}
export function bumpSettingsTs(): Promise<void> {
  return settingsTs.setValue(Date.now());
}
