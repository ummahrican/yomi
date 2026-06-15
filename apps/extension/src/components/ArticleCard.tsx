import { useEffect, useRef, useState } from "react";
import type { Prefs } from "@daily-alt/shared";
import type { FeedItem } from "@daily-alt/shared";
import { relativeTime } from "@/src/lib/time";
import { ArticleImage } from "./ArticleImage";
import { BookmarkIcon, CommentIcon, LinkIcon, MoreIcon, PlayIcon, UpvoteIcon } from "./icons";

function MenuButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="block w-full truncate px-3 py-1.5 text-left text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
    >
      {children}
    </button>
  );
}

interface Props {
  item: FeedItem;
  density: Prefs["density"];
  isBookmarked: boolean;
  isUpvoted: boolean;
  isRead: boolean;
  onUpvote: (id: number) => void;
  onToggleBookmark: (item: FeedItem) => void;
  onOpen: (item: FeedItem) => void;
  onTagClick: (tag: string) => void;
  onImpression: (item: FeedItem) => void;
  onHide?: (id: number) => void;
  onMuteSource?: (slug: string, name: string) => void;
  onMuteTag?: (tag: string) => void;
  onSourceClick?: (slug: string, name: string) => void;
  index?: number;
  isSelected?: boolean;
  /** Force the horizontal (image-left) layout regardless of density — used to
   *  collapse the grid to rows on narrow screens. */
  horizontal?: boolean;
}

export function ArticleCard(props: Props) {
  const { item, density, isBookmarked, isUpvoted, isRead } = props;
  const sponsored = item.type === "sponsored";
  const ref = useRef<HTMLElement>(null);
  const [bumped, setBumped] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const showMenu = !sponsored && !!props.onHide;
  const isVideo = item.type === "article" && item.format === "video";

  // Report sponsored impressions when the card is ≥50% visible for ≥1s.
  useEffect(() => {
    if (!sponsored || !ref.current) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => props.onImpression(item), 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(ref.current);
    return () => {
      obs.disconnect();
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsored, item.id]);

  const upvotes = item.type === "article" ? item.upvotes + (bumped ? 1 : 0) : 0;
  const comments = item.type === "article" ? item.comments : 0;
  // Horizontal (image-left row) when the user picks "list" density OR the grid
  // has collapsed to a single column on a narrow screen.
  const compact = density === "list" || !!props.horizontal;

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type !== "article" || isUpvoted) return;
    setBumped(true);
    props.onUpvote(item.id);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    props.onToggleBookmark(item);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(item.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  const avatarEl = item.source.iconUrl ? (
    <img src={item.source.iconUrl} alt="" className="h-7 w-7 rounded-full object-cover" referrerPolicy="no-referrer" />
  ) : (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
      {item.source.name.charAt(0).toUpperCase()}
    </span>
  );

  const sourceNameEl = !sponsored && props.onSourceClick ? (
    <button
      onClick={(e) => { e.stopPropagation(); props.onSourceClick?.(item.source.slug, item.source.name); }}
      className="truncate font-medium hover:text-emerald-600 hover:underline dark:hover:text-emerald-400"
    >
      {item.source.name}
    </button>
  ) : (
    <span className="truncate font-medium">{item.source.name}</span>
  );

  const metaEl =
    item.type === "article" ? (
      <>
        <time>{relativeTime(item.publishedAt)}</time>
        {isVideo ? (
          <><span aria-hidden>·</span><span className="font-medium text-rose-500 dark:text-rose-400">Video</span></>
        ) : item.readingMinutes ? (
          <><span aria-hidden>·</span><span>{item.readingMinutes}m read</span></>
        ) : null}
      </>
    ) : (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
        Promoted
      </span>
    );

  const tagsEl =
    item.tags.length > 0 ? (
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 overflow-hidden">
        {item.tags.slice(0, 3).map((t) => (
          <button
            key={t}
            onClick={(e) => { e.stopPropagation(); props.onTagClick(t); }}
            className="rounded-lg border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            #{t}
          </button>
        ))}
      </div>
    ) : null;

  const menuEl = showMenu ? (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        aria-label="More options"
        onClick={() => setMenuOpen((o) => !o)}
        className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <MoreIcon width={18} height={18} />
      </button>
      {menuOpen ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            <MenuButton onClick={() => { setMenuOpen(false); props.onHide?.(item.id); }}>Not interested</MenuButton>
            <MenuButton onClick={() => { setMenuOpen(false); props.onMuteSource?.(item.source.slug, item.source.name); }}>Mute {item.source.name}</MenuButton>
            {item.tags.slice(0, 3).map((t) => (
              <MenuButton key={t} onClick={() => { setMenuOpen(false); props.onMuteTag?.(t); }}>Mute #{t}</MenuButton>
            ))}
          </div>
        </>
      ) : null}
    </div>
  ) : null;

  const actionsEl = !sponsored ? (
    <div className="flex items-center gap-0.5 text-zinc-500 dark:text-zinc-400">
      <button
        onClick={handleUpvote}
        aria-label="Upvote"
        className={[
          "flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition",
          isUpvoted ? "text-emerald-600 dark:text-emerald-400" : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
        ].join(" ")}
      >
        <UpvoteIcon width={18} height={18} />
        {upvotes > 0 ? <span className="font-medium">{upvotes}</span> : null}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); props.onOpen(item); }}
        aria-label="Comments"
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <CommentIcon width={18} height={18} />
        {comments > 0 ? <span className="font-medium">{comments}</span> : null}
      </button>
      <button
        onClick={handleBookmark}
        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
        className={[
          "rounded-lg px-2 py-1.5 transition",
          isBookmarked ? "text-amber-600 dark:text-amber-400" : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
        ].join(" ")}
      >
        <BookmarkIcon width={18} height={18} filled={isBookmarked} />
      </button>
      <button
        onClick={handleCopy}
        aria-label="Copy link"
        title="Copy link"
        className="ml-auto rounded-lg px-2 py-1.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {copied ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Copied</span> : <LinkIcon width={18} height={18} />}
      </button>
    </div>
  ) : null;

  const imageEl = (
    <div className="relative overflow-hidden rounded-xl">
      <ArticleImage
        src={item.imageUrl}
        alt=""
        sourceName={item.source.name}
        className={compact ? "h-full w-28 object-cover sm:w-36" : "h-36 w-full object-cover"}
      />
      {isVideo ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/15">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-black/65 text-white shadow-lg">
            <PlayIcon width={22} height={22} />
          </span>
        </span>
      ) : null}
    </div>
  );

  const baseClass = [
    "group relative flex cursor-pointer rounded-2xl border transition",
    "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
    sponsored ? "ring-1 ring-amber-300/60 dark:ring-amber-500/30" : "",
    props.isSelected ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-950" : "",
    isRead && !sponsored ? "opacity-65" : "",
  ].join(" ");

  // Horizontal layout (image left, content right) — "list" density or narrow screen.
  if (compact) {
    return (
      <article ref={ref as React.RefObject<HTMLElement>} data-card-index={props.index} onClick={() => props.onOpen(item)} className={`${baseClass} flex-row items-stretch overflow-hidden p-0`}>
        <div className="shrink-0 p-1">{imageEl}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-3 pr-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            {avatarEl}
            {sourceNameEl}
            <span aria-hidden>·</span>
            {metaEl}
            <span className="ml-auto">{menuEl}</span>
          </div>
          <h3 className="line-clamp-2 font-bold leading-snug text-zinc-900 dark:text-zinc-50">{item.title}</h3>
          {tagsEl}
          {actionsEl}
        </div>
      </article>
    );
  }

  // Card density: avatar header → title → tags → time → image → actions (daily.dev order).
  return (
    <article
      ref={ref as React.RefObject<HTMLElement>}
      data-card-index={props.index}
      onClick={() => props.onOpen(item)}
      className={`${baseClass} min-h-[18rem] flex-col p-0`}
    >
      <div className="flex flex-col px-4">
        <header className="-mx-1.5 mt-4 flex h-8 items-center gap-2">
          {avatarEl}
          <span className="min-w-0 flex-1 truncate text-sm text-zinc-500 dark:text-zinc-400">{sourceNameEl}</span>
          <span className="opacity-0 transition group-hover:opacity-100">{menuEl}</span>
        </header>
        <h3 className="mt-2 line-clamp-3 break-words font-bold text-zinc-900 dark:text-zinc-50">{item.title}</h3>
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-1.5 px-4">
        {tagsEl}
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">{metaEl}</div>
      </div>

      <div className="flex flex-col px-1 pb-1">
        <div className="mb-1 mt-2 px-1">{imageEl}</div>
        {actionsEl ? <div className="px-1">{actionsEl}</div> : null}
      </div>
    </article>
  );
}
