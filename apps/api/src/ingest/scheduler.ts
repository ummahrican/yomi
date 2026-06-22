import { Cron } from "croner";
import { ingestAll, reviveAutoDisabled } from "./runner";

let running = false;

/** Guard so overlapping cron ticks don't pile up if a pass runs long. */
async function guarded(kinds?: Array<"rss" | "hn" | "devto">) {
  if (running) {
    console.log("[ingest] previous pass still running, skipping tick");
    return;
  }
  running = true;
  try {
    await ingestAll(kinds);
  } catch (err) {
    console.error("[ingest] pass error:", err);
  } finally {
    running = false;
  }
}

/** Start the background ingestion crons. Returns a stop() handle. */
export function startScheduler(): () => void {
  // Kick off an initial pass shortly after boot so a fresh DB fills quickly.
  // Revive first, so a redeploy immediately gives previously-trapped feeds (e.g.
  // a YouTube channel disabled by a transient outage) a fresh chance.
  const warmup = setTimeout(async () => {
    await reviveAutoDisabled();
    void guarded();
  }, 3_000);

  const jobs = [
    new Cron("*/10 * * * *", () => void guarded(["hn"])),
    new Cron("*/15 * * * *", () => void guarded(["rss"])),
    new Cron("*/20 * * * *", () => void guarded(["devto"])),
    // Daily: heal sources auto-disabled by transient failures, then re-ingest.
    new Cron("0 4 * * *", async () => {
      await reviveAutoDisabled();
      void guarded(["rss"]);
    }),
  ];

  console.log("[ingest] scheduler started (hn:10m, rss:15m, devto:20m, revive:daily)");

  return () => {
    clearTimeout(warmup);
    jobs.forEach((j) => j.stop());
  };
}
