import { fetchJson } from "../lib/http";
import { clampDate, makeExcerpt, normalizeTags, type NormalizedItem } from "./normalize";

interface DevtoArticle {
  title: string;
  url: string;
  description?: string;
  cover_image?: string | null;
  social_image?: string | null;
  tag_list?: string[];
  published_at?: string;
  positive_reactions_count?: number;
  comments_count?: number;
  reading_time_minutes?: number;
  user?: { name?: string };
}

async function fetchList(url: string): Promise<NormalizedItem[]> {
  const articles = await fetchJson<DevtoArticle[]>(url);
  const now = new Date();
  return articles
    .filter((a) => a.url && a.title)
    .map((a): NormalizedItem => ({
      url: a.url,
      title: a.title,
      excerpt: makeExcerpt(a.description),
      author: a.user?.name ?? null,
      imageUrl: a.cover_image ?? a.social_image ?? null,
      tags: normalizeTags(a.tag_list ?? []),
      publishedAt: clampDate(a.published_at ? new Date(a.published_at) : null, now),
      externalScore: a.positive_reactions_count ?? 0,
      externalComments: a.comments_count ?? 0,
      readingMinutes: a.reading_time_minutes ?? null,
      commentsUrl: a.comments_count ? `${a.url}#comments` : null,
    }));
}

/** Combine dev.to's "top this week" and "latest" feeds, deduped by URL. */
export async function fetchDevto(): Promise<NormalizedItem[]> {
  const [top, latest] = await Promise.all([
    fetchList("https://dev.to/api/articles?per_page=100&top=7"),
    fetchList("https://dev.to/api/articles/latest?per_page=50"),
  ]);
  const byUrl = new Map<string, NormalizedItem>();
  for (const it of [...top, ...latest]) byUrl.set(it.url, it);
  return [...byUrl.values()];
}
