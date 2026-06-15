/** Non-schema shared constants and helpers. */

/** Local preference shape persisted in the extension (browser.storage.local). */
export interface Prefs {
  deviceId: string;
  theme: "light" | "dark" | "system";
  density: "comfortable" | "compact" | "list";
  followedTags: string[];
  disabledSources: string[];
}

export const DEFAULT_PREFS: Omit<Prefs, "deviceId"> = {
  theme: "dark",
  density: "comfortable",
  followedTags: [],
  disabledSources: [],
};

/** Feed assembly cadence: first promoted card index, then every Nth thereafter. */
export const SPONSORED_FIRST_SLOT = 3;
export const SPONSORED_EVERY = 8;
