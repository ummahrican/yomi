import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { ArticleItemSchema } from "@daily-alt/shared";
import { db } from "../db/client";
import { articles, sources } from "../db/schema";

export async function articleRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/api/articles/:id",
    schema: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      response: { 200: ArticleItemSchema, 404: z.object({ error: z.string() }) },
    },
    handler: async (req, reply) => {
      const [row] = await db
        .select({
          id: articles.id,
          title: articles.title,
          url: articles.canonicalUrl,
          imageUrl: articles.imageUrl,
          excerpt: articles.excerpt,
          author: articles.author,
          tags: articles.tags,
          publishedAt: articles.publishedAt,
          upvotes: articles.upvotes,
          comments: articles.externalComments,
          format: articles.format,
          readingMinutes: articles.readingMinutes,
          commentsUrl: articles.commentsUrl,
          sourceSlug: sources.slug,
          sourceName: sources.name,
          sourceIcon: sources.iconUrl,
        })
        .from(articles)
        .innerJoin(sources, eq(articles.sourceId, sources.id))
        .where(eq(articles.id, req.params.id))
        .limit(1);

      if (!row) return reply.code(404).send({ error: "not found" });

      return {
        type: "article" as const,
        id: row.id,
        title: row.title,
        url: row.url,
        source: { slug: row.sourceSlug, name: row.sourceName, iconUrl: row.sourceIcon },
        imageUrl: row.imageUrl,
        excerpt: row.excerpt,
        author: row.author,
        tags: row.tags,
        publishedAt: row.publishedAt.toISOString(),
        upvotes: row.upvotes,
        comments: row.comments,
        format: row.format === "video" ? ("video" as const) : ("article" as const),
        readingMinutes: row.readingMinutes ?? null,
        commentsUrl: row.commentsUrl ?? null,
      };
    },
  });
}
