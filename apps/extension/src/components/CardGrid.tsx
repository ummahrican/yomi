import { useEffect, useRef } from "react";
import type { FeedItem, Prefs } from "@daily-alt/shared";
import { useMediaQuery } from "@/src/hooks/useMediaQuery";
import { ArticleCard } from "./ArticleCard";

interface Props {
  items: FeedItem[];
  density: Prefs["density"];
  bookmarkIds: Set<number>;
  upvotedIds: Set<number>;
  readIds: Set<number>;
  onUpvote: (id: number) => void;
  onToggleBookmark: (item: FeedItem) => void;
  onOpen: (item: FeedItem) => void;
  onTagClick: (tag: string) => void;
  onImpression: (item: FeedItem) => void;
  onHide?: (id: number) => void;
  onMuteSource?: (slug: string, name: string) => void;
  onMuteTag?: (tag: string) => void;
  onSourceClick?: (slug: string, name: string) => void;
  selectedIndex?: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  isLoading: boolean;
}

function Skeleton({ horizontal }: { horizontal: boolean }) {
  return (
    <div
      className={`animate-pulse overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${horizontal ? "flex" : ""}`}
    >
      <div className={horizontal ? "h-24 w-36 shrink-0 bg-zinc-200 dark:bg-zinc-800" : "aspect-[16/9] w-full bg-zinc-200 dark:bg-zinc-800"} />
      <div className="flex-1 space-y-2 p-3">
        <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

export function CardGrid(props: Props) {
  const { items, density } = props;
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && props.hasNextPage && !props.isFetchingNextPage) {
          props.fetchNextPage();
        }
      },
      { rootMargin: "600px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [props.hasNextPage, props.isFetchingNextPage, props.fetchNextPage]);

  // Collapse the grid to horizontal rows when the viewport is narrow (below the
  // `sm` breakpoint), matching daily.dev's responsive behavior. The "list"
  // density is always horizontal.
  const narrow = useMediaQuery("(max-width: 639px)");
  const horizontal = density === "list" || narrow;

  const gridClass = horizontal
    ? density === "list"
      ? "mx-auto flex max-w-3xl flex-col gap-3"
      : "flex flex-col gap-3"
    : density === "compact"
      ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  if (props.isLoading && items.length === 0) {
    return (
      <div className={gridClass}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} horizontal={horizontal} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className={gridClass}>
        {items.map((item, i) => (
          <ArticleCard
            key={`${item.type}-${item.id}`}
            item={item}
            index={i}
            isSelected={i === props.selectedIndex}
            density={density}
            horizontal={horizontal}
            isBookmarked={item.type === "article" && props.bookmarkIds.has(item.id)}
            isUpvoted={item.type === "article" && props.upvotedIds.has(item.id)}
            isRead={item.type === "article" && props.readIds.has(item.id)}
            onUpvote={props.onUpvote}
            onToggleBookmark={props.onToggleBookmark}
            onOpen={props.onOpen}
            onTagClick={props.onTagClick}
            onImpression={props.onImpression}
            onHide={props.onHide}
            onMuteSource={props.onMuteSource}
            onMuteTag={props.onMuteTag}
            onSourceClick={props.onSourceClick}
          />
        ))}
      </div>
      <div ref={sentinel} className="h-10" />
      {props.isFetchingNextPage ? (
        <p className="py-4 text-center text-sm text-zinc-500">Loading more…</p>
      ) : null}
    </>
  );
}
