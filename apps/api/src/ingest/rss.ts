import Parser from "rss-parser";
import { USER_AGENT } from "../lib/http";
import {
  clampDate,
  estimateReadingMinutes,
  firstImageFromHtml,
  makeExcerpt,
  normalizeTags,
  type NormalizedItem,
} from "./normalize";

/** Pull a YouTube video id out of a watch/shorts/youtu.be URL. */
function youtubeId(link: string): string | null {
  try {
    const u = new URL(link);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    const m = u.pathname.match(/\/(shorts|embed)\/([^/?]+)/);
    return m ? m[2] : null;
  } catch {
    return null;
  }
}

type CustomItem = {
  creator?: string;
  "dc:creator"?: string;
  "content:encoded"?: string;
  "media:content"?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
  "media:thumbnail"?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
};

const parser: Parser<unknown, CustomItem> = new Parser({
  timeout: 10_000,
  headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
  customFields: {
    item: [
      ["dc:creator", "dc:creator"],
      ["content:encoded", "content:encoded"],
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"],
    ],
  },
});

function mediaUrl(field: CustomItem["media:content" | "media:thumbnail"]): string | null {
  if (!field) return null;
  const node = Array.isArray(field) ? field[0] : field;
  return node?.$?.url ?? null;
}

function pickImage(item: Parser.Item & CustomItem): string | null {
  // Priority: enclosure -> media:content -> media:thumbnail -> first <img> in body.
  if (item.enclosure?.url && /^https?:/i.test(item.enclosure.url) && /image|jpg|jpeg|png|webp|gif/i.test(item.enclosure.type ?? item.enclosure.url)) {
    return item.enclosure.url;
  }
  return (
    mediaUrl(item["media:content"]) ??
    mediaUrl(item["media:thumbnail"]) ??
    firstImageFromHtml(item["content:encoded"]) ??
    firstImageFromHtml(item.content)
  );
}

/** Fetch just the feed's metadata + item count — used to validate submissions. */
export async function fetchFeedMeta(
  feedUrl: string,
): Promise<{ title?: string; link?: string; itemCount: number }> {
  const feed = await parser.parseURL(feedUrl);
  return { title: feed.title, link: feed.link, itemCount: (feed.items ?? []).length };
}

/**
 * Fetch and parse an RSS/Atom feed into normalized items. Throws on error.
 * Pass `{ video: true }` for YouTube channel feeds: items become video cards
 * with a thumbnail derived from the video id.
 */
export async function fetchRssFeed(
  feedUrl: string,
  opts: { video?: boolean } = {},
): Promise<NormalizedItem[]> {
  const feed = await parser.parseURL(feedUrl);
  const now = new Date();

  return (feed.items ?? [])
    .filter((it) => it.link && it.title)
    .map((it): NormalizedItem => {
      const item = it as Parser.Item & CustomItem;
      const published = item.isoDate
        ? new Date(item.isoDate)
        : item.pubDate
          ? new Date(item.pubDate)
          : null;
      const content = item["content:encoded"] ?? item.content;

      if (opts.video) {
        const vid = youtubeId(item.link!);
        return {
          url: item.link!,
          title: item.title!,
          excerpt: makeExcerpt(item.contentSnippet ?? content, 160),
          author: item.creator ?? (item as { author?: string }).author ?? null,
          imageUrl: vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : null,
          tags: normalizeTags([...(item.categories ?? []), "video"]),
          publishedAt: clampDate(published, now),
          externalScore: 0,
          externalComments: 0,
          format: "video",
          readingMinutes: null,
        };
      }

      return {
        url: item.link!,
        title: item.title!,
        excerpt: makeExcerpt(item.contentSnippet ?? content),
        author: item.creator ?? item["dc:creator"] ?? (item as { author?: string }).author ?? null,
        imageUrl: pickImage(item),
        tags: normalizeTags(item.categories ?? []),
        publishedAt: clampDate(published, now),
        externalScore: 0,
        externalComments: 0,
        format: "article",
        readingMinutes: estimateReadingMinutes(content),
      };
    });
}
