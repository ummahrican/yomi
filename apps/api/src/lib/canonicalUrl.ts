import { sha256 } from "./hash";

/** Query params that are pure tracking noise and should never affect identity. */
const TRACKING_PARAMS = [
  /^utm_/i,
  /^ref$/i,
  /^ref_src$/i,
  /^source$/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^mc_cid$/i,
  /^mc_eid$/i,
  /^igshid$/i,
  /^cmpid$/i,
  /^cmp$/i,
  /^_hsenc$/i,
  /^_hsmi$/i,
  /^spm$/i,
];

function isTracking(key: string): boolean {
  return TRACKING_PARAMS.some((re) => re.test(key));
}

/**
 * Normalize a URL so the same article from different feeds collapses to one
 * identity: https, lowercase host, no default port, no trailing slash, no
 * tracking params, sorted params, no fragment.
 * Returns the input trimmed if it can't be parsed.
 */
export function canonicalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }

  // Scheme: upgrade http -> https for identity purposes (most sites serve both).
  if (url.protocol === "http:") url.protocol = "https:";

  url.hostname = url.hostname.toLowerCase();
  // Drop default ports.
  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }

  // Strip tracking params, then sort the rest for a stable string.
  const params = url.searchParams;
  for (const key of [...params.keys()]) {
    if (isTracking(key)) params.delete(key);
  }
  params.sort();

  // Drop fragments (SPA route fragments are rare for blog articles).
  url.hash = "";

  // Normalize trailing slash on the path (but keep root "/").
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  let out = url.toString();
  // URL keeps a trailing "?" only if there were params; guard anyway.
  out = out.replace(/\?$/, "");
  return out;
}

export function urlHash(raw: string): string {
  return sha256(canonicalizeUrl(raw));
}
