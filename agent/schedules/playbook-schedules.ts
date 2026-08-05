import { defineSchedule } from "eve/schedules";

/**
 * Production-only minute tick for due playbook schedules.
 * Override Next origin with BRAIN_INTERNAL_URL when needed.
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
          await fetch(`${internalBrainOrigin()}/api/playbook-schedules/run`, {
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
