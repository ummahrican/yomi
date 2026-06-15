import { useEffect, useState } from "react";
import { DEFAULT_PREFS, type Prefs } from "@daily-alt/shared";
import { getPrefs, setPrefs, watchPrefs } from "@/src/lib/prefs";

type PrefsValue = Omit<Prefs, "deviceId">;

export function usePrefs() {
  const [prefs, setLocal] = useState<PrefsValue>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getPrefs().then((p) => {
      if (active) {
        setLocal(p);
        setLoaded(true);
      }
    });
    const unwatch = watchPrefs((p) => p && setLocal(p));
    return () => {
      active = false;
      unwatch();
    };
  }, []);

  const update = (patch: Partial<PrefsValue>) => {
    const next = { ...prefs, ...patch };
    setLocal(next);
    void setPrefs(next);
  };

  return { prefs, loaded, update };
}
