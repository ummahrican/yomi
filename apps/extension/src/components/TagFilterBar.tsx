interface Props {
  tags: { name: string; count: number }[];
  followedTags: string[];
  activeTag?: string;
  onSelect: (tag?: string) => void;
}

/** Followed tags first, then the most popular tags from the API. */
export function TagFilterBar({ tags, followedTags, activeTag, onSelect }: Props) {
  const followed = new Set(followedTags);
  const ordered = [
    ...followedTags,
    ...tags.map((t) => t.name).filter((n) => !followed.has(n)),
  ].slice(0, 24);

  return (
    <div className="border-b border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
        <button onClick={() => onSelect(undefined)} className={chip(!activeTag)}>
          For you
        </button>
        {ordered.map((name) => (
          <button key={name} onClick={() => onSelect(name)} className={chip(activeTag === name)}>
            {followed.has(name) ? "★ " : "#"}
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function chip(active: boolean): string {
  return [
    "shrink-0 rounded-full px-3 py-1 text-sm transition",
    active
      ? "bg-emerald-500 text-white"
      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
  ].join(" ");
}
