import { useCallback, useEffect, useState } from "react";
import {
  addHidden,
  getHidden,
  getMuted,
  muteSource as muteSourceFn,
  muteTag as muteTagFn,
  unmuteSource as unmuteSourceFn,
  unmuteTag as unmuteTagFn,
  watchMuted,
  type Muted,
} from "@/src/lib/muted";

export function useMuted() {
  const [muted, setMuted] = useState<Muted>({ tags: [], sources: [] });
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  useEffect(() => {
    void getMuted().then(setMuted);
    void getHidden().then(setHidden);
    return watchMuted(setMuted);
  }, []);

  const hide = useCallback(async (id: number) => {
    setHidden((prev) => new Set(prev).add(id));
    await addHidden(id);
  }, []);

  const muteTag = useCallback(async (t: string) => setMuted(await muteTagFn(t)), []);
  const unmuteTag = useCallback(async (t: string) => setMuted(await unmuteTagFn(t)), []);
  const muteSource = useCallback(async (s: string) => setMuted(await muteSourceFn(s)), []);
  const unmuteSource = useCallback(async (s: string) => setMuted(await unmuteSourceFn(s)), []);

  return { muted, hidden, hide, muteTag, unmuteTag, muteSource, unmuteSource };
}
