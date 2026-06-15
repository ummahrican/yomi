import { useEffect, useRef, useState } from "react";
import type { FeedItem } from "@daily-alt/shared";

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

interface Handlers {
  onOpen: (item: FeedItem) => void;
  onBookmark: (item: FeedItem) => void;
  onUpvote: (id: number) => void;
}

/** j/k (or arrows) to move a selection through the feed; o/Enter open, b bookmark,
 *  u upvote. Returns the selected index so the grid can highlight it. */
export function useKeyboardNav(items: FeedItem[], h: Handlers, enabled = true): number {
  const [sel, setSel] = useState(-1);
  const selRef = useRef(sel);
  selRef.current = sel;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!enabled || e.metaKey || e.ctrlKey || e.altKey || isTyping()) return;
      const list = itemsRef.current;
      if (!list.length) return;
      const cur = selRef.current;
      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setSel(Math.min(list.length - 1, cur < 0 ? 0 : cur + 1));
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setSel(Math.max(0, cur < 0 ? 0 : cur - 1));
          break;
        case "o":
        case "Enter":
          if (cur >= 0) {
            e.preventDefault();
            h.onOpen(list[cur]);
          }
          break;
        case "b": {
          const it = list[cur];
          if (it?.type === "article") {
            e.preventDefault();
            h.onBookmark(it);
          }
          break;
        }
        case "u": {
          const it = list[cur];
          if (it?.type === "article") {
            e.preventDefault();
            h.onUpvote(it.id);
          }
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [h, enabled]);

  useEffect(() => {
    if (sel < 0) return;
    document.querySelector(`[data-card-index="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  return sel;
}
