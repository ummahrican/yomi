import { z } from "zod";

/**
 * Shared zod schemas — the single source of truth for the API <-> extension
 * contract. The API validates requests/responses against these; the extension
 * parses responses through them so a server change surfaces as a type error.
 */

export const SourceRefSchema = z.object({
  slug: z.string(),
  name: z.string(),
  iconUrl: z.string().nullable().optional(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

/** An organic, aggregated article card. */
export const ArticleItemSchema = z.object({
  type: z.literal("article"),
  id: z.number(),
  title: z.string(),
  url: z.string(),
  source: SourceRefSchema,
  imageUrl: z.string().nullable(),
  excerpt: z.string().nullable(),
  author: z.string().nullable(),
  tags: z.array(z.string()),
  publishedAt: z.string(), // ISO 8601
  upvotes: z.number(),
  comments: z.number(),
  format: z.enum(["article", "video"]).default("article"),
  readingMinutes: z.number().nullable().default(null),
  commentsUrl: z.string().nullable().default(null),
  score: z.number().optional(),
});
export type ArticleItem = z.infer<typeof ArticleItemSchema>;

/** A paid/promoted card injected into the feed at a fixed cadence. */
export const SponsoredItemSchema = z.object({
  type: z.literal("sponsored"),
  id: z.number(),
  promoted: z.literal(true),
  title: z.string(),
  url: z.string(),
  source: SourceRefSchema,
  imageUrl: z.string().nullable(),
  excerpt: z.string().nullable(),
  tags: z.array(z.string()),
});
export type SponsoredItem = z.infer<typeof SponsoredItemSchema>;

export const FeedItemSchema = z.discriminatedUnion("type", [
  ArticleItemSchema,
  SponsoredItemSchema,
]);
export type FeedItem = z.infer<typeof FeedItemSchema>;

// --- GET /api/feed ---
export const FeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  tag: z.string().optional(),
  q: z.string().optional(),
  sources: z.string().optional(), // csv of source slugs (allowlist)
  mutedTags: z.string().optional(), // csv of tags to exclude
  mutedSources: z.string().optional(), // csv of source slugs to exclude
  boostTags: z.string().optional(), // csv of followed tags to rank higher
});
export type FeedQuery = z.infer<typeof FeedQuerySchema>;

export const FeedResponseSchema = z.object({
  items: z.array(FeedItemSchema),
  nextCursor: z.string().nullable(),
});
export type FeedResponse = z.infer<typeof FeedResponseSchema>;

// --- GET /api/tags ---
export const TagsResponseSchema = z.object({
  tags: z.array(z.object({ name: z.string(), count: z.number() })),
});
export type TagsResponse = z.infer<typeof TagsResponseSchema>;

// --- POST /api/events ---
export const EventBodySchema = z.object({
  type: z.enum(["upvote", "click", "impression"]),
  targetType: z.enum(["article", "sponsored"]),
  targetId: z.number().int().positive(),
  deviceId: z.string().uuid(),
});
export type EventBody = z.infer<typeof EventBodySchema>;

export const EventResponseSchema = z.object({
  ok: z.boolean(),
  upvotes: z.number().optional(),
});
export type EventResponse = z.infer<typeof EventResponseSchema>;

// --- Admin: sponsored posts ---
export const SponsoredCreateSchema = z.object({
  advertiser: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  targetUrl: z.string().url(),
  displaySource: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  active: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  weight: z.number().int().min(1).default(1),
});
export type SponsoredCreate = z.infer<typeof SponsoredCreateSchema>;

export const SponsoredUpdateSchema = SponsoredCreateSchema.partial();
export type SponsoredUpdate = z.infer<typeof SponsoredUpdateSchema>;

// --- Anonymous E2E sync ---
export const SyncPullSchema = z.object({ authToken: z.string().min(16) });
export const SyncPullResponseSchema = z.object({
  payload: z.string().nullable(),
  version: z.number(),
});
export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>;

export const SyncPushSchema = z.object({
  authToken: z.string().min(16),
  payload: z.string(),
  baseVersion: z.number().int().min(0),
});
export const SyncPushResponseSchema = z.object({
  ok: z.boolean(),
  version: z.number(),
  conflict: z.boolean().optional(),
  payload: z.string().nullable().optional(),
});
export type SyncPushResponse = z.infer<typeof SyncPushResponseSchema>;

// --- Community sources ---
export const SourceSubmitSchema = z.object({
  feedUrl: z.string().url(),
  name: z.string().min(1).max(80).optional(),
  homepageUrl: z.string().url().optional(),
  deviceId: z.string().uuid(),
});
export type SourceSubmit = z.infer<typeof SourceSubmitSchema>;

export const SourceListItemSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  kind: z.string(),
  homepageUrl: z.string().nullable(),
  iconUrl: z.string().nullable(),
  status: z.string(), // 'approved' | 'pending' | 'rejected'
  votes: z.number(), // raw vote count (one per device)
  // Trust-weighted vote demand — only votes from established devices. Admin
  // moderation view only; omitted on the public listing.
  weightedVotes: z.number().optional(),
  voted: z.boolean(), // has this device already voted?
  lastStatus: z.string().nullable(),
});
export type SourceListItem = z.infer<typeof SourceListItemSchema>;

export const SourcesResponseSchema = z.object({
  items: z.array(SourceListItemSchema),
  approveVotes: z.number(), // "suggested demand" hint (not a gate; admins approve)
});
export type SourcesResponse = z.infer<typeof SourcesResponseSchema>;

export const SourceVoteResponseSchema = z.object({
  ok: z.boolean(),
  votes: z.number(),
  status: z.string(),
});
export type SourceVoteResponse = z.infer<typeof SourceVoteResponseSchema>;

export const SponsoredRowSchema = z.object({
  id: z.number(),
  advertiser: z.string(),
  title: z.string(),
  excerpt: z.string().nullable(),
  imageUrl: z.string().nullable(),
  targetUrl: z.string(),
  displaySource: z.string().nullable(),
  tags: z.array(z.string()),
  active: z.boolean(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  weight: z.number(),
  impressions: z.number(),
  clicks: z.number(),
  createdAt: z.string(),
});
export type SponsoredRow = z.infer<typeof SponsoredRowSchema>;
