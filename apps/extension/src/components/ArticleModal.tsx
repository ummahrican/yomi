import { useEffect, useState } from "react";
import type { ArticleItem, FeedItem } from "@daily-alt/shared";
import { fetchHnComments, hnItemId, type HnComment } from "@/src/lib/hnComments";
import { relativeTime } from "@/src/lib/time";
import { ArticleImage } from "./ArticleImage";
import { BookmarkIcon, CloseIcon, CommentIcon, LinkIcon, PlayIcon, UpvoteIcon } from "./icons";

interface Props {
  item: ArticleItem;
  isBookmarked: boolean;
  isUpvoted: boolean;
  onClose: () => void;
  onReadExternal: (item: FeedItem) => void;
  onUpvote: (id: number) => void;
  onToggleBookmark: (item: FeedItem) => void;
  onTagClick: (tag: string) => void;
  onSourceClick?: (slug: string, name: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function ArticleModal(props: Props) {
  const { item } = props;
  const isVideo = item.format === "video";
  const hnId = hnItemId(item.commentsUrl);
  const [comments, setComments] = useState<HnComment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [copied, setCopied] = useState(false);

  // Keyboard: Esc closes, ←/→ navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
      else if (e.key === "ArrowLeft" && props.hasPrev) props.onPrev?.();
      else if (e.key === "ArrowRight" && props.hasNext) props.onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Load Hacker News comments when this article links to a HN thread.
  useEffect(() => {
    setComments(null);
    if (!hnId) return;
    setLoadingComments(true);
    let active = true;
    fetchHnComments(hnId)
      .then((c) => active && setComments(c))
      .catch(() => active && setComments([]))
      .finally(() => active && setLoadingComments(false));
    return () => {
      active = false;
    };
  }, [hnId]);

  const host = (() => {
    try {
      return new URL(item.url).hostname.replace(/^www\./, "");
    } catch {
      return item.source.name;
    }
  })();

  const copy = () => {
    void navigator.clipboard.writeText(item.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8" onClick={props.onClose}>
      <div
        className="relative my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center gap-1 rounded-t-2xl border-b border-zinc-200 bg-white/90 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
          <button onClick={props.onPrev} disabled={!props.hasPrev} aria-label="Previous" className={navBtn}>‹</button>
          <button onClick={props.onNext} disabled={!props.hasNext} aria-label="Next" className={navBtn}>›</button>
          <button onClick={copy} aria-label="Copy link" className={`${navBtn} ml-auto`}>
            {copied ? <span className="text-xs font-medium text-emerald-600">✓</span> : <LinkIcon width={18} height={18} />}
          </button>
          <button onClick={props.onClose} aria-label="Close" className={navBtn}>
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <div className="px-5 py-4 sm:px-7">
          {/* Source */}
          <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            {item.source.iconUrl ? (
              <img src={item.source.iconUrl} alt="" className="h-5 w-5 rounded" referrerPolicy="no-referrer" />
            ) : null}
            <button
              onClick={() => props.onSourceClick?.(item.source.slug, item.source.name)}
              className="font-medium hover:text-emerald-600 hover:underline dark:hover:text-emerald-400"
            >
              {item.source.name}
            </button>
          </div>

          <h1 className="text-2xl font-bold leading-snug text-zinc-900 dark:text-zinc-50">{item.title}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
            <time>{relativeTime(item.publishedAt)}</time>
            {isVideo ? (
              <><span aria-hidden>·</span><span className="font-medium text-rose-500 dark:text-rose-400">Video</span></>
            ) : item.readingMinutes ? (
              <><span aria-hidden>·</span><span>{item.readingMinutes}m read</span></>
            ) : null}
            <span aria-hidden>·</span>
            <span>From {host}</span>
          </div>

          <button onClick={() => props.onReadExternal(item)} className="mt-4 block w-full overflow-hidden rounded-xl">
            <div className="relative">
              <ArticleImage src={item.imageUrl} alt="" sourceName={item.source.name} className="aspect-[16/9] w-full object-cover" />
              {isVideo ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/15">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-black/65 text-white shadow-lg">
                    <PlayIcon width={26} height={26} />
                  </span>
                </span>
              ) : null}
            </div>
          </button>

          {item.excerpt ? (
            <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              {item.excerpt}
            </p>
          ) : null}

          {item.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <button
                  key={t}
                  onClick={() => props.onTagClick(t)}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  #{t}
                </button>
              ))}
            </div>
          ) : null}

          {/* Actions */}
          <div className="mt-5 flex items-center gap-2 border-y border-zinc-200 py-3 dark:border-zinc-800">
            <button
              onClick={() => props.onUpvote(item.id)}
              className={[
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                props.isUpvoted
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200",
              ].join(" ")}
            >
              <UpvoteIcon width={16} height={16} /> {item.upvotes + (props.isUpvoted ? 1 : 0)}
            </button>
            <button
              onClick={() => props.onToggleBookmark(item)}
              className={[
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                props.isBookmarked
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200",
              ].join(" ")}
            >
              <BookmarkIcon width={16} height={16} filled={props.isBookmarked} /> Save
            </button>
            <button
              onClick={() => props.onReadExternal(item)}
              className="ml-auto rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              {isVideo ? "Watch ↗" : "Read post ↗"}
            </button>
          </div>

          {/* Comments */}
          <div className="mt-5 pb-2">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
              <CommentIcon width={18} height={18} />
              {item.comments > 0 ? `${item.comments} comments` : "Discussion"}
            </h3>

            {hnId ? (
              loadingComments ? (
                <p className="text-sm text-zinc-500">Loading comments…</p>
              ) : comments && comments.length > 0 ? (
                <>
                  <ul className="space-y-3">
                    {comments.map((c) => (
                      <li key={c.id} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                        <div className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {c.by} · {relativeTime(new Date(c.time * 1000).toISOString())}
                        </div>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                          {c.text.length > 600 ? c.text.slice(0, 600) + "…" : c.text}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={item.commentsUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    View full thread on Hacker News ↗
                  </a>
                </>
              ) : (
                <p className="text-sm text-zinc-500">No comments yet.</p>
              )
            ) : item.commentsUrl ? (
              <a
                href={item.commentsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {item.comments > 0 ? `View ${item.comments} comments` : "View discussion"} ↗
              </a>
            ) : (
              <p className="text-sm text-zinc-500">
                No discussion thread for this source — open the original to comment.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const navBtn =
  "grid h-8 w-8 place-items-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800 text-lg leading-none";
