import { defineSchedule } from "eve/schedules";

/**
 * Production-only minute tick. `eve` / Next `pnpm dev` do not fire cron cadence;
 * use the chat UI “Run now” or host crontab against POST /api/briefs/run.
 *
 * Posts to the Next app (not this Nitro PORT). Override with BRAIN_INTERNAL_URL
 * when Next is not on http://127.0.0.1:3000.
 */
function internalBrainOrigin(): string {
  const configured = process.env.BRAIN_INTERNAL_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "http://127.0.0.1:3000";
}

export default defineSchedule({
  cron: "* * * * *",
  async run({ waitUntil }) {
    waitUntil(
      (async () => {
        try {
          await fetch(`${internalBrainOrigin()}/api/briefs/run`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ source: "schedule" }),
          });
        } catch {
          // Next may still be booting; the next minute retries.
        }
      })(),
    );
  },
});
