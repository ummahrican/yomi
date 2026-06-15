import { useCallback, useEffect, useState } from "react";
import { disableSync, enableSync, getSyncState, restoreSync, syncNow } from "@/src/lib/sync";

export function useSync() {
  const [enabled, setEnabled] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    void getSyncState().then((s) => {
      setEnabled(s.enabled);
      setPhrase(s.phrase);
    });
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await enableSync();
      setPhrase(p);
      setEnabled(true);
      setLastSyncedAt(Date.now());
      return p;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const restore = useCallback(async (input: string) => {
    setBusy(true);
    setError(null);
    try {
      await restoreSync(input);
      setPhrase(input.trim().toLowerCase());
      setEnabled(true);
      setLastSyncedAt(Date.now());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const sync = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await syncNow();
      setLastSyncedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    await disableSync();
    setEnabled(false);
    setPhrase("");
  }, []);

  return { enabled, phrase, busy, error, lastSyncedAt, enable, restore, sync, disable };
}
