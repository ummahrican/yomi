import { useCallback, useEffect, useState } from "react";
import type { ArticleItem } from "@daily-alt/shared";
import { getBookmarkIds, getBookmarks, toggleBookmark } from "@/src/lib/db";

export function useBookmarks() {
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [items, setItems] = useState<ArticleItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const [idSet, list] = await Promise.all([getBookmarkIds(), getBookmarks()]);
    setIds(idSet);
    setItems(list);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (article: ArticleItem) => {
      await toggleBookmark(article);
      await refresh();
    },
    [refresh],
  );

  return { ids, items, loaded, toggle, refresh };
}
