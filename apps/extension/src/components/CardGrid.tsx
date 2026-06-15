import { useEffect, useRef } from "react";
import type { FeedItem, Prefs } from "@daily-alt/shared";
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

function Skeleton({ density }: { density: Prefs["density"] }) {
  if (density === "list") {
    return (
      <div className="flex animate-pulse overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-24 w-36 shrink-0 bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1 space-y-2 p-3">
          <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-1.5">
          <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-2.5 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="mt-3 flex gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="aspect-[4/3] w-48 shrink-0 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
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

  // Landscape cards are wide, so the grid tops out at 2–3 columns (vs the old
  // 4-up vertical grid). "list" is a single column of thin rows.
  const gridClass =
    density === "list"
      ? "mx-auto flex max-w-3xl flex-col gap-3"
      : density === "compact"
        ? "mx-auto grid max-w-6xl grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3"
        : "mx-auto grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2";

  if (props.isLoading && items.length === 0) {
    return (
      <div className={gridClass}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} density={density} />
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
