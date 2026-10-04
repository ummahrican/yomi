import pLimit from "p-limit";
import { fetchJson } from "../lib/http";
import { db } from "../db/client";
import { inArray } from "drizzle-orm";
import { articles } from "../db/schema";
import { urlHash } from "../lib/canonicalUrl";
import { clampDate, normalizeTags, type NormalizedItem } from "./normalize";
import { fetchPageMeta, hostLabel } from "./pageMeta";

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

  const stories = items.filter(
    (it): it is HnItem => !!it && it.type === "story" && !!it.url && !!it.title,
  );

  // Already-enriched stories don't need their destination re-fetched every cycle.
  const hashes = stories.map((it) => urlHash(it.url!));
  const known = new Set(
    (
      await db
        .select({ h: articles.urlHash, site: articles.siteName })
        .from(articles)
        .where(inArray(articles.urlHash, hashes))
    )
      .filter((r) => r.site)
      .map((r) => r.h),
  );

  // Follow each link to the real page for its image, description and site name.
  const metaLimit = pLimit(8);
  return Promise.all(
    stories.map((it) =>
      metaLimit(async (): Promise<NormalizedItem> => {
        const meta = known.has(urlHash(it.url!)) ? null : await fetchPageMeta(it.url!);
        return {
          url: it.url!,
          title: it.title!,
          excerpt: meta?.excerpt ?? null,
          author: meta?.author ?? it.by ?? null,
          imageUrl: meta?.imageUrl ?? null,
          tags: normalizeTags(["hackernews"]),
          publishedAt: clampDate(it.time ? new Date(it.time * 1000) : null, now),
          externalScore: it.score ?? 0,
          externalComments: it.descendants ?? 0,
          commentsUrl: `https://news.ycombinator.com/item?id=${it.id}`,
          siteName: meta?.siteName ?? hostLabel(it.url!),
        };
      }),
    ),
  );
}
