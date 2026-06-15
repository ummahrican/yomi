import type { FeedItem, Prefs } from "@daily-alt/shared";
import { CardGrid } from "@/src/components/CardGrid";
import type { useBookmarks } from "@/src/hooks/useBookmarks";

interface Props {
  bookmarks: ReturnType<typeof useBookmarks>;
  density: Prefs["density"];
  upvotedIds: Set<number>;
  readIds: Set<number>;
  onUpvote: (id: number) => void;
  onOpen: (item: FeedItem) => void;
  onTagClick: (tag: string) => void;
}

export function BookmarksView(props: Props) {
  const { items, loaded, ids, toggle } = props.bookmarks;

  if (loaded && items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4 py-24 text-center">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No saved articles</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Tap the bookmark icon on any article to save it here for later — available even offline.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      <CardGrid
        items={items}
        density={props.density}
        bookmarkIds={ids}
        upvotedIds={props.upvotedIds}
        readIds={props.readIds}
        onUpvote={props.onUpvote}
        onToggleBookmark={(item) => item.type === "article" && toggle(item)}
        onOpen={props.onOpen}
        onTagClick={props.onTagClick}
        onImpression={() => {}}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={() => {}}
        isLoading={!loaded}
      />
    </div>
  );
}
