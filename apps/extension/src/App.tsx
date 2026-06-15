import { useCallback, useEffect, useMemo, useState } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { FeedItem } from "@daily-alt/shared";
import { Header } from "@/src/components/Header";
import { SettingsDrawer } from "@/src/components/SettingsDrawer";
import { TagFilterBar } from "@/src/components/TagFilterBar";
import { useBookmarks } from "@/src/hooks/useBookmarks";
import { useDebounced } from "@/src/hooks/useDebounced";
import { useInteractions } from "@/src/hooks/useInteractions";
import { useMuted } from "@/src/hooks/useMuted";
import { usePrefs } from "@/src/hooks/usePrefs";
import { useSources } from "@/src/hooks/useSources";
import { useStreak } from "@/src/hooks/useStreak";
import { useSync } from "@/src/hooks/useSync";
import { useResolvedTheme } from "@/src/hooks/useTheme";
import { useTags } from "@/src/hooks/useTags";
import { getSyncState, syncNow } from "@/src/lib/sync";
import { persister, queryClient } from "@/src/lib/queryClient";
import { BookmarksView } from "@/src/views/BookmarksView";
import { FeedView } from "@/src/views/FeedView";

function Shell() {
  const { prefs, update } = usePrefs();
  const resolvedTheme = useResolvedTheme(prefs.theme);
  const interactions = useInteractions();
  const bookmarks = useBookmarks();
  const tagsQuery = useTags();
  const streak = useStreak();
  const muted = useMuted();
  const sources = useSources(interactions.deviceId);
  const sync = useSync();

  // If sync is on: pull+merge+push on load, and push again when the tab is hidden.
  useEffect(() => {
    let cancelled = false;
    void getSyncState().then((s) => {
      if (s.enabled && !cancelled) void syncNow().then(() => bookmarks.refresh()).catch(() => {});
    });
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        void getSyncState().then((s) => {
          if (s.enabled) void syncNow().catch(() => {});
        });
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [view, setView] = useState<"feed" | "bookmarks">("feed");
  const [rawQuery, setRawQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | undefined>();
  const [activeSource, setActiveSource] = useState<{ slug: string; name: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [discoveredSources, setDiscoveredSources] = useState<{ slug: string; name: string }[]>([]);
  const [showTop, setShowTop] = useState(false);

  // Global shortcuts: ⌘K or "/" focuses search; Esc blurs / clears source filter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        e.preventDefault();
        document.getElementById("yomi-search")?.focus();
      } else if (e.key === "Escape") {
        if (el?.id === "yomi-search") el.blur();
        else setActiveSource(null);
      }
    };
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const query = useDebounced(rawQuery, 350).trim();

  const tags = tagsQuery.data?.tags ?? [];

  const handleToggleBookmark = (item: FeedItem) => {
    if (item.type === "article") void bookmarks.toggle(item);
  };

  const handleTagClick = (tag: string) => {
    setView("feed");
    setActiveTag(tag);
    setActiveSource(null);
    setRawQuery("");
    window.scrollTo({ top: 0 });
  };

  const handleSourceClick = (slug: string, name: string) => {
    setView("feed");
    setActiveSource({ slug, name });
    setActiveTag(undefined);
    setRawQuery("");
    window.scrollTo({ top: 0 });
  };

  // Accumulate discovered sources so hiding one (which removes it from the feed)
  // doesn't remove it from the Settings list.
  const handleSourcesDiscovered = useCallback((found: { slug: string; name: string }[]) => {
    setDiscoveredSources((prev) => {
      const map = new Map(prev.map((s) => [s.slug, s.name]));
      let changed = false;
      for (const s of found) {
        if (map.get(s.slug) !== s.name) {
          map.set(s.slug, s.name);
          changed = true;
        }
      }
      return changed ? [...map].map(([slug, name]) => ({ slug, name })) : prev;
    });
  }, []);

  const availableSources = useMemo(() => {
    const map = new Map(discoveredSources.map((s) => [s.slug, s.name]));
    // Always include currently-hidden sources so they can be un-hidden, even if
    // they're not in the current feed view.
    for (const slug of prefs.disabledSources) if (!map.has(slug)) map.set(slug, slug);
    return [...map].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [discoveredSources, prefs.disabledSources]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Header
        query={rawQuery}
        onQueryChange={setRawQuery}
        view={view}
        onViewChange={setView}
        resolvedTheme={resolvedTheme}
        onToggleTheme={() => update({ theme: resolvedTheme === "dark" ? "light" : "dark" })}
        onOpenSettings={() => setSettingsOpen(true)}
        bookmarkCount={bookmarks.ids.size}
        streak={streak?.current ?? 0}
      />

      {view === "feed" ? (
        <TagFilterBar
          tags={tags}
          followedTags={prefs.followedTags}
          activeTag={activeTag}
          onSelect={(t) => {
            setActiveTag(t);
            setActiveSource(null);
          }}
        />
      ) : null}

      {view === "feed" && activeSource ? (
        <div className="mx-auto max-w-7xl px-4 pt-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            Showing only {activeSource.name}
            <button onClick={() => setActiveSource(null)} aria-label="Clear source filter" className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400">
              ✕
            </button>
          </span>
        </div>
      ) : null}

      {view === "feed" ? (
        <FeedView
          tag={activeTag}
          q={query || undefined}
          sourceFilter={activeSource?.slug}
          density={prefs.density}
          disabledSources={prefs.disabledSources}
          boostTags={prefs.followedTags}
          mutedTags={muted.muted.tags}
          mutedSources={muted.muted.sources}
          hiddenIds={muted.hidden}
          bookmarkIds={bookmarks.ids}
          upvotedIds={interactions.upvotedIds}
          readIds={interactions.readIds}
          onUpvote={interactions.upvote}
          onToggleBookmark={handleToggleBookmark}
          onOpen={interactions.openItem}
          onTagClick={handleTagClick}
          onImpression={interactions.trackImpression}
          onMarkRead={interactions.markRead}
          onHide={muted.hide}
          onMuteSource={(slug) => muted.muteSource(slug)}
          onMuteTag={muted.muteTag}
          onSourceClick={handleSourceClick}
          onSourcesDiscovered={handleSourcesDiscovered}
        />
      ) : (
        <BookmarksView
          bookmarks={bookmarks}
          density={prefs.density}
          upvotedIds={interactions.upvotedIds}
          readIds={interactions.readIds}
          onUpvote={interactions.upvote}
          onOpen={interactions.openItem}
          onTagClick={handleTagClick}
        />
      )}

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onUpdate={update}
        tags={tags}
        availableSources={availableSources}
        sources={sources}
        muted={muted.muted}
        sync={sync}
        onUnmuteTag={muted.unmuteTag}
        onUnmuteSource={muted.unmuteSource}
        onViewSource={(slug, name) => {
          handleSourceClick(slug, name);
          setSettingsOpen(false);
        }}
        onDataChanged={() => void bookmarks.refresh()}
        onDataCleared={() => {
          void bookmarks.refresh();
          setSettingsOpen(false);
        }}
      />

      {showTop ? (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          className="fixed bottom-5 right-5 z-30 grid h-11 w-11 place-items-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-600"
        >
          ↑
        </button>
      ) : null}

      <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-zinc-400">
        Yomi · an open feed of the latest in tech · articles link out to their original publishers
      </footer>
    </div>
  );
}

export function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <Shell />
    </PersistQueryClientProvider>
  );
}
