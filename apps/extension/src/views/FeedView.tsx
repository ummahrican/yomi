import { useEffect, useMemo, useState } from "react";
import type { ArticleItem, FeedItem, Prefs } from "@daily-alt/shared";
import { ArticleModal } from "@/src/components/ArticleModal";
import { CardGrid } from "@/src/components/CardGrid";
import { useFeed } from "@/src/hooks/useFeed";
import { useKeyboardNav } from "@/src/hooks/useKeyboardNav";

interface Props {
  tag?: string;
  q?: string;
  sourceFilter?: string;
  density: Prefs["density"];
  disabledSources: string[];
  mutedTags: string[];
  mutedSources: string[];
  hiddenIds: Set<number>;
  bookmarkIds: Set<number>;
  upvotedIds: Set<number>;
  readIds: Set<number>;
  onUpvote: (id: number) => void;
  onToggleBookmark: (item: FeedItem) => void;
  onOpen: (item: FeedItem) => void;
  onTagClick: (tag: string) => void;
  onImpression: (item: FeedItem) => void;
  onMarkRead: (id: number) => void;
  onHide: (id: number) => void;
  onMuteSource: (slug: string, name: string) => void;
  onMuteTag: (tag: string) => void;
  onSourceClick: (slug: string, name: string) => void;
  onSourcesDiscovered: (sources: { slug: string; name: string }[]) => void;
}

export function FeedView(props: Props) {
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useFeed({
      tag: props.tag,
      q: props.q,
      sources: props.sourceFilter ? [props.sourceFilter] : undefined,
      mutedTags: props.mutedTags,
      mutedSources: props.mutedSources,
    });

  // Flatten pages, drop disabled/hidden, and de-dupe ids across page overlaps.
  const items = useMemo(() => {
    const seen = new Set<string>();
    const disabled = new Set(props.disabledSources);
    const out: FeedItem[] = [];
    for (const page of data?.pages ?? []) {
      for (const item of page.items) {
        const key = `${item.type}-${item.id}`;
        if (seen.has(key)) continue;
        if (item.type === "article" && disabled.has(item.source.slug)) continue;
        if (item.type === "article" && props.hiddenIds.has(item.id)) continue;
        seen.add(key);
        out.push(item);
      }
    }
    return out;
  }, [data, props.disabledSources, props.hiddenIds]);

  // Surface the sources present in the feed so Settings can offer to hide them.
  // IMPORTANT: derive this from the UNFILTERED pages (not `items`), otherwise a
  // hidden source disappears from the feed and can never be un-hidden.
  const discovered = useMemo(() => {
    const map = new Map<string, string>();
    for (const page of data?.pages ?? []) {
      for (const item of page.items) {
        if (item.type === "article") map.set(item.source.slug, item.source.name);
      }
    }
    return [...map].map(([slug, name]) => ({ slug, name }));
  }, [data]);

  useEffect(() => {
    if (discovered.length > 0) props.onSourcesDiscovered(discovered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discovered]);

  // Clicking an article opens a reader modal; sponsored cards open externally.
  const [modalItem, setModalItem] = useState<ArticleItem | null>(null);
  const articleItems = useMemo(
    () => items.filter((i): i is ArticleItem => i.type === "article"),
    [items],
  );
  const modalIndex = modalItem ? articleItems.findIndex((a) => a.id === modalItem.id) : -1;

  const openItem = (item: FeedItem) => {
    if (item.type === "sponsored") {
      props.onOpen(item);
      return;
    }
    setModalItem(item);
    props.onMarkRead(item.id);
  };
  const gotoOffset = (delta: number) => {
    const next = articleItems[modalIndex + delta];
    if (next) {
      setModalItem(next);
      props.onMarkRead(next.id);
      if (modalIndex + delta >= articleItems.length - 3 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  const selectedIndex = useKeyboardNav(
    items,
    { onOpen: openItem, onBookmark: props.onToggleBookmark, onUpvote: props.onUpvote },
    !modalItem,
  );

  const offline = isError && items.length > 0;

  if (isError && items.length === 0) {
    return (
      <Empty
        title="Couldn't reach the feed"
        body="Check that the API is running, then try again."
        action={<RetryButton onClick={() => refetch()} />}
      />
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <Empty
        title={props.q ? "No results" : "Nothing here yet"}
        body={props.q ? "Try a different search term." : "The feed is still filling up — check back in a minute."}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      {offline ? (
        <p className="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-center text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          You're offline — showing the last loaded feed.
        </p>
      ) : null}
      <CardGrid
        items={items}
        density={props.density}
        bookmarkIds={props.bookmarkIds}
        upvotedIds={props.upvotedIds}
        readIds={props.readIds}
        onUpvote={props.onUpvote}
        onToggleBookmark={props.onToggleBookmark}
        onOpen={openItem}
        onTagClick={props.onTagClick}
        onImpression={props.onImpression}
        onHide={props.onHide}
        onMuteSource={props.onMuteSource}
        onMuteTag={props.onMuteTag}
        onSourceClick={props.onSourceClick}
        selectedIndex={selectedIndex}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        isLoading={isLoading}
      />

      {modalItem ? (
        <ArticleModal
          item={modalItem}
          isBookmarked={props.bookmarkIds.has(modalItem.id)}
          isUpvoted={props.upvotedIds.has(modalItem.id)}
          onClose={() => setModalItem(null)}
          onReadExternal={props.onOpen}
          onUpvote={props.onUpvote}
          onToggleBookmark={props.onToggleBookmark}
          onTagClick={(t) => {
            setModalItem(null);
            props.onTagClick(t);
          }}
          onSourceClick={(slug, name) => {
            setModalItem(null);
            props.onSourceClick(slug, name);
          }}
          onPrev={() => gotoOffset(-1)}
          onNext={() => gotoOffset(1)}
          hasPrev={modalIndex > 0}
          hasNext={modalIndex >= 0 && modalIndex < articleItems.length - 1}
        />
      ) : null}
    </div>
  );
}

function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4 py-24 text-center">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{body}</p>
      {action}
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
    >
      Retry
    </button>
  );
}
