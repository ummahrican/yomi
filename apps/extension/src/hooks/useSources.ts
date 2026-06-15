import { useCallback, useEffect, useState } from "react";
import type { SourceListItem } from "@daily-alt/shared";
import { fetchSources, submitSource, voteSource } from "@/src/lib/api";

export function useSources(deviceId: string | null) {
  const [items, setItems] = useState<SourceListItem[]>([]);
  const [approveVotes, setApproveVotes] = useState(8);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const res = await fetchSources("all", deviceId);
      setItems(res.items);
      setApproveVotes(res.approveVotes);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const vote = useCallback(
    async (id: number) => {
      if (!deviceId) return;
      const res = await voteSource(id, deviceId);
      setItems((prev) =>
        prev.map((s) => (s.id === id ? { ...s, votes: res.votes, status: res.status, voted: true } : s)),
      );
    },
    [deviceId],
  );

  const submit = useCallback(
    async (feedUrl: string) => {
      if (!deviceId) return { ok: false as const, error: "no device id" };
      const res = await submitSource(feedUrl, deviceId);
      if (res.ok) await refresh();
      return res;
    },
    [deviceId, refresh],
  );

  return { items, approveVotes, loading, refresh, vote, submit };
}
