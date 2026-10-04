import * as cheerio from "cheerio";
import { fetchWithTimeout } from "../lib/http";
import { cleanImageUrl, makeExcerpt } from "./normalize";

export interface PageMeta {
  siteName: string;
  excerpt: string | null;
  imageUrl: string | null;
  author: string | null;
}

const MAX_HTML_BYTES = 512 * 1024;

/** "www.example.com" -> "example.com" */
export function hostLabel(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** Parse destination-page HTML into display metadata (OpenGraph/Twitter/meta). */
export function parsePageMeta(html: string, pageUrl: string): PageMeta | null {
  const $ = cheerio.load(html);
  const meta = (...names: string[]) => {
    for (const n of names) {
      const v =
        $(`meta[property="${n}"]`).attr("content") ?? $(`meta[name="${n}"]`).attr("content");
      if (v && v.trim()) return v.trim();
    }
    return null;
  };

  const siteName = meta("og:site_name", "application-name") ?? hostLabel(pageUrl);
  if (!siteName) return null;

  let imageUrl: string | null = null;
  const rawImage = meta("og:image", "og:image:url", "twitter:image");
  if (rawImage) {
    try {
      imageUrl = cleanImageUrl(new URL(rawImage, pageUrl).toString());
    } catch {
      imageUrl = null;
    }
  }

  return {
    siteName: siteName.slice(0, 80),
    excerpt: makeExcerpt(meta("og:description", "twitter:description", "description")),
    imageUrl,
    author: meta("author", "article:author", "twitter:creator")?.slice(0, 120) ?? null,
  };
}

/**
 * Follow a link to its destination page and read its metadata. Best-effort:
 * returns null on any failure (non-HTML, timeout, blocked) so callers fall back
 * to the aggregator's own data.
 */
export async function fetchPageMeta(url: string): Promise<PageMeta | null> {
  try {
    const res = await fetchWithTimeout(url, {
      timeoutMs: 8_000,
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    // Metadata lives in <head>; cap how much we read.
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    const html = new TextDecoder("utf-8").decode(Buffer.concat(chunks));
    return parsePageMeta(html, res.url || url);
  } catch {
    return null;
  }
}
