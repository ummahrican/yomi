import { storage } from "wxt/storage";
import { DEFAULT_PREFS, type Prefs } from "@daily-alt/shared";
import { bumpSettingsTs } from "./syncMeta";

// Prefs live in sync storage so they follow the user across devices (where the
// browser is signed in) and survive a reinstall — no accounts, no server.
const prefsItem = storage.defineItem<Omit<Prefs, "deviceId">>("sync:prefs", {
  fallback: DEFAULT_PREFS,
});
// deviceId stays local: it identifies this device for anonymous vote dedup.
const deviceIdItem = storage.defineItem<string | null>("local:deviceId", {
  fallback: null,
});

/** Stable anonymous device id, minted once and stored locally. No PII. */
export async function getDeviceId(): Promise<string> {
  let id = await deviceIdItem.getValue();
  if (!id) {
    id = crypto.randomUUID();
    await deviceIdItem.setValue(id);
  }
  return id;
}

export async function getPrefs(): Promise<Omit<Prefs, "deviceId">> {
  return prefsItem.getValue();
}

export async function setPrefs(next: Omit<Prefs, "deviceId">): Promise<void> {
  await prefsItem.setValue(next);
  await bumpSettingsTs();
}

/** Restore prefs from a sync merge without re-bumping the settings timestamp. */
export async function setPrefsRaw(next: Omit<Prefs, "deviceId">): Promise<void> {
  await prefsItem.setValue(next);
}

export function watchPrefs(cb: (p: Omit<Prefs, "deviceId">) => void): () => void {
  return prefsItem.watch(cb);
}
