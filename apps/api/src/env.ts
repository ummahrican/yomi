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

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  ADMIN_API_KEY: z.string().min(1).default("change-me"),
  INGEST_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  GRAVITY: z.coerce.number().default(1.6),
  // Minimum votes for a community source to auto-approve. The real threshold is
  // max(this floor, a majority of all known users). Admins can override either way.
  SOURCE_APPROVE_VOTES: z.coerce.number().int().min(1).default(10),
  CORS_ORIGIN: z.string().default("*"),
  INGEST_CONTACT_URL: z
    .string()
    .default("https://github.com/yourname/daily-dev-alt"),
});

export const env = EnvSchema.parse(process.env);
export type Env = typeof env;
