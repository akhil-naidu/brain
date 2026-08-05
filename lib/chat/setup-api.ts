import { z } from "zod";

const setupStatusSchema = z.object({
  commandCodeApiKeyConfigured: z.boolean(),
});

export type SetupStatus = z.infer<typeof setupStatusSchema>;

export async function fetchSetupStatus(): Promise<SetupStatus> {
  const response = await fetch("/api/setup", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Setup status request failed (${response.status})`);
  }
  const data: unknown = await response.json();
  return setupStatusSchema.parse(data);
}
