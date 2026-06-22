import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { type AdminStats, AdminStatsSchema } from "@daily-alt/shared";
import { db } from "../db/client";
import { adminGuard } from "../lib/adminAuth";

// The overview runs four full-table aggregate counts (the articles count grows
// with the corpus). The dashboard polls it on every action, so memoize the
// result briefly — a single operator never needs sub-20s freshness here.
const TTL_MS = 20_000;
let cache: { data: AdminStats; expires: number } | null = null;

/**
 * Admin overview — an at-a-glance health/traffic panel for the dashboard.
 * Everything here is derived from data we already store (no new tracking):
 * anonymous device activity, ingest health, and campaign delivery.
 */
export async function adminStatsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  app.addHook("onRequest", adminGuard);

  typed.route({
    method: "GET",
    url: "/api/admin/stats",
    schema: {
      querystring: z.object({ fresh: z.coerce.boolean().optional() }),
      response: { 200: AdminStatsSchema },
    },
    handler: async (req, reply) => {
      const now = Date.now();
      if (!req.query.fresh && cache && cache.expires > now) {
        reply.header("x-cache", "hit");
        return cache.data;
      }

      const [devices, articles, srcs, campaigns] = await Promise.all([
        db.execute<{ total: string; dau: string; wau: string }>(sql`
          SELECT count(*) AS total,
                 count(*) FILTER (WHERE last_seen >= now() - interval '24 hours') AS dau,
                 count(*) FILTER (WHERE last_seen >= now() - interval '7 days')  AS wau
          FROM devices
        `),
        db.execute<{ total: string; last24h: string }>(sql`
          SELECT count(*) AS total,
                 count(*) FILTER (WHERE fetched_at >= now() - interval '24 hours') AS last24h
          FROM articles
        `),
        db.execute<{
          approved: string;
          pending: string;
          rejected: string;
          enabled: string;
          erroring: string;
        }>(sql`
          SELECT count(*) FILTER (WHERE status = 'approved') AS approved,
                 count(*) FILTER (WHERE status = 'pending')  AS pending,
                 count(*) FILTER (WHERE status = 'rejected') AS rejected,
                 count(*) FILTER (WHERE enabled)             AS enabled,
                 count(*) FILTER (WHERE consecutive_failures > 0) AS erroring
          FROM sources
        `),
        db.execute<{
          total: string;
          active: string;
          live: string;
          impressions: string;
          clicks: string;
        }>(sql`
          SELECT count(*) AS total,
                 count(*) FILTER (WHERE active) AS active,
                 count(*) FILTER (
                   WHERE active AND starts_at <= now()
                     AND (ends_at IS NULL OR ends_at >= now())
                 ) AS live,
                 coalesce(sum(impressions), 0) AS impressions,
                 coalesce(sum(clicks), 0)      AS clicks
          FROM sponsored_posts
        `),
      ]);

      const d = devices.rows[0];
      const a = articles.rows[0];
      const s = srcs.rows[0];
      const c = campaigns.rows[0];
      const n = (v: string | number | null | undefined) => Number(v ?? 0);

      const data: AdminStats = {
        devices: { total: n(d?.total), dau: n(d?.dau), wau: n(d?.wau) },
        articles: { total: n(a?.total), last24h: n(a?.last24h) },
        sources: {
          approved: n(s?.approved),
          pending: n(s?.pending),
          rejected: n(s?.rejected),
          enabled: n(s?.enabled),
          erroring: n(s?.erroring),
        },
        campaigns: {
          total: n(c?.total),
          active: n(c?.active),
          live: n(c?.live),
          impressions: n(c?.impressions),
          clicks: n(c?.clicks),
        },
        generatedAt: new Date().toISOString(),
      };

      cache = { data, expires: now + TTL_MS };
      reply.header("x-cache", "miss");
      return data;
    },
  });
}
