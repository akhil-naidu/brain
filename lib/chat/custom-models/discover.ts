import { normalizeBaseUrl, normalizeOptionalApiKey } from "@/lib/chat/custom-models/validation";

export type DiscoveredModel = {
  readonly id: string;
  readonly label: string;
};

const MAX_CANDIDATES = 200;
const MAX_RESPONSE_BYTES = 512_000;
const FETCH_TIMEOUT_MS = 4_000;

/** Probe targets for a stored OpenAI-compatible base URL (often `…/v1`). */
export function discoveryProbeUrls(baseUrl: string): readonly string[] {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) {
    return [];
  }
  const urls = new Set<string>();

  const ollama = new URL(normalized);
  ollama.pathname = "/api/tags";
  ollama.search = "";
  ollama.hash = "";
  urls.add(ollama.toString());

  const path = new URL(normalized).pathname.replace(/\/+$/, "");
  if (path.endsWith("/models")) {
    urls.add(normalized);
  } else {
    urls.add(`${normalized}/models`);
  }

  return [...urls];
}

function readStringField(value: object, key: string): string {
  if (!(key in value)) {
    return "";
  }
  const field: unknown = Reflect.get(value, key);
  return typeof field === "string" ? field.trim() : "";
}

export function parseOllamaTagsPayload(data: unknown): readonly DiscoveredModel[] {
  if (typeof data !== "object" || data === null || !("models" in data)) {
    return [];
  }
  const modelsUnknown: unknown = Reflect.get(data, "models");
  if (!Array.isArray(modelsUnknown)) {
    return [];
  }
  const out: DiscoveredModel[] = [];
  for (const entryUnknown of modelsUnknown) {
    const entry: unknown = entryUnknown;
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const name = readStringField(entry, "name") || readStringField(entry, "model");
    if (!name) {
      continue;
    }
    const id = name.slice(0, 256);
    out.push({ id, label: id });
    if (out.length >= MAX_CANDIDATES) {
      break;
    }
  }
  return out;
}

export function parseOpenAiModelsPayload(data: unknown): readonly DiscoveredModel[] {
  if (typeof data !== "object" || data === null || !("data" in data)) {
    return [];
  }
  const listUnknown: unknown = Reflect.get(data, "data");
  if (!Array.isArray(listUnknown)) {
    return [];
  }
  const out: DiscoveredModel[] = [];
  for (const entryUnknown of listUnknown) {
    const entry: unknown = entryUnknown;
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const idRaw = readStringField(entry, "id");
    if (!idRaw) {
      continue;
    }
    const id = idRaw.slice(0, 256);
    out.push({ id, label: id });
    if (out.length >= MAX_CANDIDATES) {
      break;
    }
  }
  return out;
}

function mergeCandidates(
  batches: readonly (readonly DiscoveredModel[])[],
): readonly DiscoveredModel[] {
  const seen = new Set<string>();
  const out: DiscoveredModel[] = [];
  for (const batch of batches) {
    for (const model of batch) {
      const key = model.id.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(model);
      if (out.length >= MAX_CANDIDATES) {
        return out;
      }
    }
  }
  return out;
}

async function fetchJsonLimited(url: string, headers: Record<string, string>): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_BYTES) {
      return null;
    }
    const text = new TextDecoder().decode(buffer);
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverRemoteModels(input: {
  readonly baseUrl: string;
  readonly apiKey?: string | null;
  readonly fetchJson?: typeof fetchJsonLimited;
}): Promise<readonly DiscoveredModel[]> {
  const normalized = normalizeBaseUrl(input.baseUrl);
  if (!normalized) {
    throw new Error("Enter a valid http(s) base URL.");
  }

  const apiKey = normalizeOptionalApiKey(input.apiKey);
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }

  const fetchJson = input.fetchJson ?? fetchJsonLimited;
  const probeUrls = discoveryProbeUrls(normalized);
  const payloads = await Promise.all(probeUrls.map((url) => fetchJson(url, headers)));

  const batches = probeUrls.map((url, index) => {
    const payload = payloads[index];
    if (payload == null) {
      return [] as const;
    }
    if (url.includes("/api/tags")) {
      return parseOllamaTagsPayload(payload);
    }
    return parseOpenAiModelsPayload(payload);
  });

  return mergeCandidates(batches);
}
