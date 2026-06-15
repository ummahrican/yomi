import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedItem } from "@daily-alt/shared";
import { postEvent } from "@/src/lib/api";
import { addRead, addUpvoted, getRead, getUpvoted } from "@/src/lib/db";
import { getDeviceId } from "@/src/lib/prefs";

export function useInteractions() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [upvotedIds, setUpvotedIds] = useState<Set<number>>(new Set());
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const impressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    void getDeviceId().then(setDeviceId);
    void getUpvoted().then(setUpvotedIds);
    void getRead().then(setReadIds);
  }, []);

  const upvote = useCallback(
    (id: number) => {
      if (!deviceId || upvotedIds.has(id)) return;
      setUpvotedIds((prev) => new Set(prev).add(id));
      void addUpvoted(id);
      void postEvent({ type: "upvote", targetType: "article", targetId: id, deviceId });
    },
    [deviceId, upvotedIds],
  );

  const markRead = useCallback((id: number) => {
    setReadIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    void addRead(id);
  }, []);

  const openItem = useCallback(
    (item: FeedItem) => {
      if (deviceId) {
        void postEvent({
          type: "click",
          targetType: item.type === "sponsored" ? "sponsored" : "article",
          targetId: item.id,
          deviceId,
        });
      }
      if (item.type === "article") {
        setReadIds((prev) => new Set(prev).add(item.id));
        void addRead(item.id);
      }
      window.open(item.url, "_blank", "noopener,noreferrer");
    },
    [deviceId],
  );

  /** Report a sponsored impression at most once per card per session. */
  const trackImpression = useCallback(
    (item: FeedItem) => {
      if (item.type !== "sponsored" || !deviceId) return;
      const key = `sp-${item.id}`;
      if (impressed.current.has(key)) return;
      impressed.current.add(key);
      void postEvent({
        type: "impression",
        targetType: "sponsored",
        targetId: item.id,
        deviceId,
      });
    },
    [deviceId],
  );

  return { deviceId, upvotedIds, readIds, upvote, openItem, markRead, trackImpression };
}
