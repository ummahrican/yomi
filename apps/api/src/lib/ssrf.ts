import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF guard for user-submitted feed URLs. The community source-submission
 * endpoint makes the server fetch an arbitrary URL, so we must refuse URLs that
 * resolve to loopback, private (RFC1918), link-local, or cloud-metadata
 * addresses — otherwise a submitter could probe internal services or the
 * 169.254.169.254 instance-metadata endpoint.
 *
 * `assertPublicUrl` validates a single URL's resolved IPs. `safeFetchText`
 * additionally follows redirects manually, re-checking every hop, so a feed that
 * 30x-redirects to an internal host cannot bypass the guard (rss-parser would
 * otherwise follow redirects itself, blind to these rules).
 *
 * Residual (documented P2): DNS rebinding — the OS resolves the host again at
 * connect time, so a record that flips to a private IP between our lookup and
 * the fetch could slip through. Closing that needs connect-time IP pinning via
 * a custom undici dispatcher; out of scope for the submission threat model.
 */

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockedUrlError";
  }
}

function ipToBytes(ip: string, family: number): number[] | null {
  if (family === 4) {
    const parts = ip.split(".").map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return null;
    }
    return parts;
  }
  return null; // IPv6 handled directly below.
}

/** True for loopback / private / link-local / metadata / reserved ranges. */
export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 0) return true; // not a literal IP — treat as unsafe

  if (family === 4) {
    const b = ipToBytes(ip, 4);
    if (!b) return true;
    const [a, c, d, e] = b;
    if (a === 0) return true; // 0.0.0.0/8 "this host"
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 169 && c === 254) return true; // link-local incl. 169.254.169.254 metadata
    if (a === 172 && c >= 16 && c <= 31) return true; // 172.16.0.0/12
    if (a === 192 && c === 168) return true; // 192.168.0.0/16
    if (a === 192 && c === 0 && d === 0) return true; // 192.0.0.0/24
    if (a === 100 && c >= 64 && c <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a >= 224) return true; // multicast + reserved (224.0.0.0/3)
    void e;
    return false;
  }

  // IPv6
  const norm = ip.toLowerCase().split("%")[0]; // strip zone id
  if (norm === "::1" || norm === "::") return true; // loopback / unspecified
  if (norm.startsWith("fe80")) return true; // link-local
  if (norm.startsWith("fc") || norm.startsWith("fd")) return true; // unique-local fc00::/7
  // IPv4-mapped (::ffff:a.b.c.d) — re-check the embedded IPv4.
  const mapped = norm.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  return false;
}

/**
 * Resolve `urlString` and throw BlockedUrlError if it is not a public http(s)
 * URL. Returns the parsed URL on success.
 */
export async function assertPublicUrl(urlString: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new BlockedUrlError("Invalid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedUrlError("Only http(s) feed URLs are allowed.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, ""); // unwrap [::1]-style literals

  // Literal IP in the URL — check it directly, no DNS.
  if (isIP(host) !== 0) {
    if (isPrivateAddress(host)) {
      throw new BlockedUrlError("That address is not allowed.");
    }
    return url;
  }

  // Hostname — resolve every A/AAAA record and reject if ANY is private
  // (defeats DNS records that mix a public and a private answer).
  let records: { address: string }[];
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new BlockedUrlError("Could not resolve that host.");
  }
  if (records.length === 0 || records.some((r) => isPrivateAddress(r.address))) {
    throw new BlockedUrlError("That host is not allowed.");
  }
  return url;
}

const MAX_REDIRECTS = 5;

/**
 * Fetch a URL's body as text while enforcing SSRF rules on the initial URL AND
 * every redirect hop. Use this instead of letting a library follow redirects.
 */
export async function safeFetchText(
  urlString: string,
  { timeoutMs = 10_000, headers = {} }: { timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = urlString;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicUrl(current); // re-checked on every hop
      const res = await fetch(current, {
        signal: controller.signal,
        headers,
        redirect: "manual", // we follow redirects ourselves so each hop is vetted
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) throw new BlockedUrlError("Redirect without a Location header.");
        current = new URL(loc, current).toString(); // resolve relative redirects
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${current}`);
      return await res.text();
    }
    throw new BlockedUrlError("Too many redirects.");
  } finally {
    clearTimeout(timer);
  }
}
