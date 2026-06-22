const HN = "https://hacker-news.firebaseio.com/v0";

export interface HnComment {
  id: number;
  by: string;
  text: string;
  time: number;
}

/** Extract the HN item id from a news.ycombinator.com/item?id=… URL. */
export function hnItemId(commentsUrl: string | null): string | null {
  if (!commentsUrl || !commentsUrl.includes("ycombinator.com")) return null;
  return commentsUrl.match(/[?&]id=(\d+)/)?.[1] ?? null;
}

/** Decode HN's HTML comment body to plain text. */
function htmlToText(html: string): string {
  const stripped = html
    .replace(/<p>/gi, "\n\n")
    .replace(/<\/?[^>]+>/g, "");
  // Decode HTML entities (&gt;, &#x27;, …) via DOMParser rather than an
  // innerHTML assignment: parsing is read-only and never executes script, so
  // it's both safe and clear of AMO's "unsafe innerHTML" linter warning.
  const doc = new DOMParser().parseFromString(stripped, "text/html");
  return (doc.body.textContent ?? "").trim();
}

interface HnItem {
  by?: string;
  text?: string;
  time?: number;
  kids?: number[];
  deleted?: boolean;
  dead?: boolean;
}

/** Fetch the top-level comments for a HN story. The HN API sends CORS *,
 *  so this works directly from the extension page (no host permission). */
export async function fetchHnComments(itemId: string, limit = 8): Promise<HnComment[]> {
  const story = (await (await fetch(`${HN}/item/${itemId}.json`)).json()) as HnItem;
  const kids = (story.kids ?? []).slice(0, limit);
  const items = await Promise.all(
    kids.map((id) =>
      fetch(`${HN}/item/${id}.json`)
        .then((r) => r.json() as Promise<HnItem & { id: number }>)
        .catch(() => null),
    ),
  );
  return items
    .filter((c): c is HnItem & { id: number } => !!c && !c.deleted && !c.dead && !!c.text)
    .map((c) => ({ id: c.id, by: c.by ?? "anon", text: htmlToText(c.text!), time: c.time ?? 0 }));
}
