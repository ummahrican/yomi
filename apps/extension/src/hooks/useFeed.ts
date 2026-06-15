import { useInfiniteQuery } from "@tanstack/react-query";
import type { FeedResponse } from "@daily-alt/shared";
import { fetchFeed } from "@/src/lib/api";

export interface FeedFilters {
  tag?: string;
  q?: string;
  sources?: string[];
  mutedTags?: string[];
  mutedSources?: string[];
}

export function useFeed(filters: FeedFilters) {
  return useInfiniteQuery<FeedResponse>({
    queryKey: ["feed", filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      fetchFeed(
        {
          cursor: pageParam as string | undefined,
          limit: 20,
          tag: filters.tag,
          q: filters.q,
          sources: filters.sources,
          mutedTags: filters.mutedTags,
          mutedSources: filters.mutedSources,
        },
        signal,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
