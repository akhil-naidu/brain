import { defineSchedule } from "eve/schedules";
import {
  internalBrainOrigin,
  internalScheduleFetchHeaders,
} from "@/lib/chat/internal-brain-origin";

/**
 * Production-only minute tick. Dev `pnpm dev` does not fire this cadence;
 * use the chat UI “Run now” instead.
 *
 * Posts to the Next app (not this Nitro PORT). Override with BRAIN_INTERNAL_URL
 * when Next is not on http://127.0.0.1:3000.
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
          await fetch(`${internalBrainOrigin()}/api/briefs/run`, {
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
