/**
 * Minimal forward-only SQL migration runner. Applies every .sql file in
 * ./migrations in filename order exactly once, tracked in a _migrations table.
 * Kept deliberately simple so the DDL (tsvector, GIN indexes) stays hand-authored.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { env } from "../env";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

async function main() {
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const applied = new Set(
      (await client.query<{ name: string }>("SELECT name FROM _migrations")).rows.map(
        (r) => r.name,
      ),
    );

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      process.stdout.write(`Applying ${file} ... `);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log("ok");
        count++;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
    console.log(count === 0 ? "Already up to date." : `Applied ${count} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
