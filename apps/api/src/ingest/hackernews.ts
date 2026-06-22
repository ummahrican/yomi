import pLimit from "p-limit";
import { fetchJson } from "../lib/http";
import { clampDate, normalizeTags, type NormalizedItem } from "./normalize";

const BASE = "https://hacker-news.firebaseio.com/v0";
// Keep this modest: HN is one source among many and the feed down-weights it
// (HN_RANK_WEIGHT) so it doesn't flood. Pulling the very top stories is plenty.
const STORY_LIMIT = 60;

interface HnItem {
  id: number;
  type: string;
  by?: string;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  time?: number; // unix seconds
}

/** Pull the current top stories that link out to an external URL. */
export async function fetchHackerNews(): Promise<NormalizedItem[]> {
  const ids = await fetchJson<number[]>(`${BASE}/topstories.json`);
  const top = ids.slice(0, STORY_LIMIT);
  const limit = pLimit(10);
  const now = new Date();

  const items = await Promise.all(
    top.map((id) =>
      limit(async () => {
        try {
          return await fetchJson<HnItem>(`${BASE}/item/${id}.json`, { timeoutMs: 8_000 });
        } catch {
          return null;
        }
      }),
    ),
  );

  return items
    .filter((it): it is HnItem => !!it && it.type === "story" && !!it.url && !!it.title)
    .map((it): NormalizedItem => ({
      url: it.url!,
      title: it.title!,
      excerpt: null,
      author: it.by ?? null,
      imageUrl: null,
      tags: normalizeTags(["hackernews"]),
      publishedAt: clampDate(it.time ? new Date(it.time * 1000) : null, now),
      externalScore: it.score ?? 0,
      externalComments: it.descendants ?? 0,
      commentsUrl: `https://news.ycombinator.com/item?id=${it.id}`,
    }));
}
