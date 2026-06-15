import type { Prefs } from "@daily-alt/shared";
import { FlameIcon, MoonIcon, SearchIcon, SettingsIcon, SunIcon } from "./icons";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  view: "feed" | "bookmarks";
  onViewChange: (v: "feed" | "bookmarks") => void;
  resolvedTheme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  bookmarkCount: number;
  streak: number;
}

export function Header(props: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-50">
          <svg viewBox="0 0 128 128" className="h-7 w-7" role="img" aria-label="Yomi">
            <rect width="128" height="128" rx="28" fill="#10b981" />
            <g fill="#fff">
              <circle cx="30.7" cy="38.4" r="9.6" />
              <rect x="43.5" y="28.8" width="56.5" height="19.2" rx="9.6" />
              <circle cx="30.7" cy="64" r="9.6" />
              <rect x="43.5" y="54.4" width="56.5" height="19.2" rx="9.6" />
              <circle cx="30.7" cy="89.6" r="9.6" />
              <rect x="43.5" y="80" width="33.5" height="19.2" rx="9.6" />
            </g>
          </svg>
          <span className="hidden sm:inline">Yomi</span>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <SearchIcon width={16} height={16} />
          </span>
          <input
            id="yomi-search"
            value={props.query}
            onChange={(e) => props.onQueryChange(e.target.value)}
            placeholder="Search articles…  (press / )"
            className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <nav className="flex items-center gap-1">
          {props.streak > 0 ? (
            <span
              title={`${props.streak}-day reading streak`}
              className="mr-1 hidden items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-sm font-semibold text-orange-600 sm:flex dark:bg-orange-500/15 dark:text-orange-400"
            >
              <FlameIcon width={15} height={15} />
              {props.streak}
            </span>
          ) : null}
          <button
            onClick={() => props.onViewChange("feed")}
            className={tabClass(props.view === "feed")}
          >
            Feed
          </button>
          <button
            onClick={() => props.onViewChange("bookmarks")}
            className={tabClass(props.view === "bookmarks")}
          >
            Saved{props.bookmarkCount > 0 ? ` (${props.bookmarkCount})` : ""}
          </button>
          <button
            onClick={props.onToggleTheme}
            aria-label="Toggle theme"
            className="ml-1 rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {props.resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            onClick={props.onOpenSettings}
            aria-label="Settings"
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <SettingsIcon />
          </button>
        </nav>
      </div>
    </header>
  );
}

function tabClass(active: boolean): string {
  return [
    "rounded-lg px-3 py-1.5 text-sm font-medium transition",
    active
      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
  ].join(" ");
}

export type { Prefs };
