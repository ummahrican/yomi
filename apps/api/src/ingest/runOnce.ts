/** One-shot ingestion for local testing: `pnpm ingest:once`. */
import { pool } from "../db/client";
import { ingestAll } from "./runner";

ingestAll()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Ingest failed:", err);
    process.exit(1);
  });
