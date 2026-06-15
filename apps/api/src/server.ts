import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { pool } from "./db/client";
import { env } from "./env";
import { startScheduler } from "./ingest/scheduler";
import { adminRoutes } from "./routes/admin";
import { adminPageRoutes } from "./routes/adminPage";
import { articleRoutes } from "./routes/article";
import { eventRoutes } from "./routes/events";
import { feedRoutes } from "./routes/feed";
import { adminSourceRoutes, sourceRoutes } from "./routes/sources";
import { syncRoutes } from "./routes/sync";
import { tagRoutes } from "./routes/tags";

async function build() {
  // 8MB body limit so a heavy bookmark backup can sync in one push.
  const app = Fastify({ logger: true, bodyLimit: 8 * 1024 * 1024 }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
  });
  await app.register(rateLimit, { max: 600, timeWindow: "1 minute" });

  app.get("/health", async () => ({ status: "ok", time: new Date().toISOString() }));

  await app.register(feedRoutes);
  await app.register(articleRoutes);
  await app.register(tagRoutes);
  await app.register(eventRoutes);
  await app.register(sourceRoutes);
  await app.register(syncRoutes);
  await app.register(adminRoutes);
  await app.register(adminSourceRoutes);
  await app.register(adminPageRoutes);

  return app;
}

async function main() {
  const app = await build();
  let stopScheduler: (() => void) | null = null;

  if (env.INGEST_ENABLED) {
    stopScheduler = startScheduler();
  } else {
    app.log.info("ingestion disabled (INGEST_ENABLED=false)");
  }

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received, shutting down`);
    stopScheduler?.();
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
