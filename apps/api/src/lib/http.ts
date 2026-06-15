import { env } from "../env";

export const USER_AGENT = `daily-dev-alt/0.1 (+${env.INGEST_CONTACT_URL})`;

/** fetch() with a hard timeout and a polite, identifiable User-Agent. */
export async function fetchWithTimeout(
  url: string,
  { timeoutMs = 10_000, headers = {} }: { timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, ...headers },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(url: string, opts?: { timeoutMs?: number }): Promise<T> {
  const res = await fetchWithTimeout(url, {
    timeoutMs: opts?.timeoutMs,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}
