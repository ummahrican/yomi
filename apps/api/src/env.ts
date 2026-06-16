import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { z } from "zod";

// Load the monorepo-root .env regardless of cwd. pnpm runs package scripts with
// cwd = apps/api, so a plain `dotenv/config` (which reads ./.env) would miss the
// root .env. Real process env still wins (dotenv never overrides existing vars).
const here = dirname(fileURLToPath(import.meta.url)); // apps/api/src
config({ path: join(here, "..", "..", "..", ".env") }); // -> repo root .env
config(); // also pick up a local apps/api/.env if one exists

const DEFAULT_ADMIN_KEY = "change-me";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  ADMIN_API_KEY: z.string().min(1).default(DEFAULT_ADMIN_KEY),
  INGEST_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  GRAVITY: z.coerce.number().default(1.6),
  // Community sources never auto-publish — an admin approves them. This is a
  // "suggested demand" hint shown in the dashboard/extension (votes / this), to
  // help admins prioritize the moderation queue. Not a gate.
  SOURCE_APPROVE_VOTES: z.coerce.number().int().min(1).default(10),
  // Trust-weighting for the moderation queue: a vote only counts toward a
  // source's *weighted demand* if the voting device is "established" — at least
  // this many hours old (or returning / genuinely active). Blunts sybil bursts
  // of freshly-minted device UUIDs without any account or tracking.
  VOTE_TRUST_MIN_AGE_HOURS: z.coerce.number().int().min(0).default(24),
  CORS_ORIGIN: z.string().default("*"),
  INGEST_CONTACT_URL: z
    .string()
    .default("https://github.com/ummahrican/yomi"),
});

export const env = EnvSchema.parse(process.env);
export type Env = typeof env;

// Fail-fast in production rather than booting with a publicly-known admin key.
// The admin dashboard (campaigns + source moderation) is gated solely by this
// key, so a forgotten override would expose moderation to anyone.
if (env.NODE_ENV === "production" && env.ADMIN_API_KEY === DEFAULT_ADMIN_KEY) {
  throw new Error(
    "Refusing to start: ADMIN_API_KEY is still the default 'change-me'. " +
      "Set a strong, unique ADMIN_API_KEY (e.g. `openssl rand -hex 32`).",
  );
}
