import { DEFAULT_AGENT_SAFETY_POSTURE, type AgentSafetyPosture } from "@/lib/auth/workspaces/types";
import { ensureAuthReady, getWorkspaceStore } from "@/lib/auth/server";

const CACHE_TTL_MS = 3000;

let cachedAt = 0;
let cachedPosture: AgentSafetyPosture = DEFAULT_AGENT_SAFETY_POSTURE;

export function invalidateAgentSafetyPostureCache(): void {
  cachedAt = 0;
}

export async function resolveAgentSafetyPosture(): Promise<AgentSafetyPosture> {
  const now = Date.now();
  if (cachedAt > 0 && now - cachedAt < CACHE_TTL_MS) {
    return cachedPosture;
  }
  try {
    await ensureAuthReady();
    const policies = await getWorkspaceStore().getPolicies();
    cachedPosture = policies.agentSafetyPosture;
    cachedAt = now;
    return cachedPosture;
  } catch {
    cachedPosture = DEFAULT_AGENT_SAFETY_POSTURE;
    cachedAt = now;
    return cachedPosture;
  }
}
