import {
  EventResponseSchema,
  FeedResponseSchema,
  SourceListItemSchema,
  SourceVoteResponseSchema,
  SourcesResponseSchema,
  SyncPullResponseSchema,
  SyncPushResponseSchema,
  TagsResponseSchema,
  type EventBody,
  type FeedResponse,
  type SourceListItem,
  type SourceVoteResponse,
  type SourcesResponse,
  type SyncPullResponse,
  type SyncPushResponse,
  type TagsResponse,
} from "@daily-alt/shared";

const BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:3000";

export interface FeedParams {
  cursor?: string;
  limit?: number;
  tag?: string;
  q?: string;
  sources?: string[];
  mutedTags?: string[];
  mutedSources?: string[];
  boostTags?: string[];
}

export async function fetchFeed(params: FeedParams, signal?: AbortSignal): Promise<FeedResponse> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.tag) qs.set("tag", params.tag);
  if (params.q) qs.set("q", params.q);
  if (params.sources?.length) qs.set("sources", params.sources.join(","));
  if (params.mutedTags?.length) qs.set("mutedTags", params.mutedTags.join(","));
  if (params.mutedSources?.length) qs.set("mutedSources", params.mutedSources.join(","));
  if (params.boostTags?.length) qs.set("boostTags", params.boostTags.join(","));

  const res = await fetch(`${BASE}/api/feed?${qs.toString()}`, { signal });
  if (!res.ok) throw new Error(`feed request failed: ${res.status}`);
  return FeedResponseSchema.parse(await res.json());
}

// --- Community sources ---
export async function fetchSources(
  status: "approved" | "pending" | "all",
  deviceId?: string,
): Promise<SourcesResponse> {
  const qs = new URLSearchParams({ status });
  if (deviceId) qs.set("deviceId", deviceId);
  const res = await fetch(`${BASE}/api/sources?${qs.toString()}`);
  if (!res.ok) throw new Error(`sources request failed: ${res.status}`);
  return SourcesResponseSchema.parse(await res.json());
}

export async function submitSource(
  feedUrl: string,
  deviceId: string,
): Promise<{ ok: true; item: SourceListItem } | { ok: false; error: string }> {
  const res = await fetch(`${BASE}/api/sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedUrl, deviceId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: (json as { error?: string }).error ?? `Failed (${res.status})` };
  return { ok: true, item: SourceListItemSchema.parse(json) };
}

export async function voteSource(id: number, deviceId: string): Promise<SourceVoteResponse> {
  const res = await fetch(`${BASE}/api/sources/${id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  if (!res.ok) throw new Error(`vote failed: ${res.status}`);
  return SourceVoteResponseSchema.parse(await res.json());
}

// --- Anonymous E2E sync ---
export async function syncPull(authToken: string): Promise<SyncPullResponse> {
  const res = await fetch(`${BASE}/api/sync/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authToken }),
  });
  if (!res.ok) throw new Error(`sync pull failed: ${res.status}`);
  return SyncPullResponseSchema.parse(await res.json());
}

export async function syncPush(
  authToken: string,
  payload: string,
  baseVersion: number,
): Promise<SyncPushResponse> {
  const res = await fetch(`${BASE}/api/sync/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authToken, payload, baseVersion }),
  });
  if (!res.ok) throw new Error(`sync push failed: ${res.status}`);
  return SyncPushResponseSchema.parse(await res.json());
}

export async function fetchTags(): Promise<TagsResponse> {
  const res = await fetch(`${BASE}/api/tags`);
  if (!res.ok) throw new Error(`tags request failed: ${res.status}`);
  return TagsResponseSchema.parse(await res.json());
}

/** Fire-and-forget event reporting; never throws (counters are best-effort). */
export async function postEvent(body: EventBody): Promise<number | undefined> {
  try {
    const res = await fetch(`${BASE}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return undefined;
    return EventResponseSchema.parse(await res.json()).upvotes;
  } catch {
    return undefined;
  }
}
