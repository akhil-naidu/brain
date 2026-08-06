import { defineSchedule } from "eve/schedules";
import {
  internalBrainOrigin,
  internalScheduleFetchHeaders,
} from "@/lib/chat/internal-brain-origin";

/**
 * Production-only minute tick for due playbook schedules.
 * Override Next origin with BRAIN_INTERNAL_URL when needed.
 * Requires BRAIN_INTERNAL_TOKEN (same secret the Next due-sweep routes expect).
 */
export default defineSchedule({
  cron: "* * * * *",
  async run({ waitUntil }) {
    waitUntil(
      (async () => {
        try {
          const headers = internalScheduleFetchHeaders();
          if (!headers) {
            return;
          }
          await fetch(`${internalBrainOrigin()}/api/playbook-schedules/run`, {
            method: "POST",
            headers,
            body: JSON.stringify({ source: "schedule" }),
          });
        } catch {
          // Next may still be booting; the next minute retries.
        }
      })(),
    );
  },
});
