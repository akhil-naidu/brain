import { describe, expect, it, vi } from "vitest";
import {
  discoverRemoteModels,
  discoveryProbeUrls,
  parseOllamaTagsPayload,
  parseOpenAiModelsPayload,
} from "@/lib/chat/custom-models/discover";

describe("discoveryProbeUrls", () => {
  it("probes Ollama tags and OpenAI models for a /v1 base", () => {
    expect(discoveryProbeUrls("http://127.0.0.1:11434/v1")).toEqual([
      "http://127.0.0.1:11434/api/tags",
      "http://127.0.0.1:11434/v1/models",
    ]);
  });

  it("rejects non-http URLs", () => {
    expect(discoveryProbeUrls("ftp://example.com/v1")).toEqual([]);
  });
});

describe("payload parsers", () => {
  it("parses Ollama tags", () => {
    expect(
      parseOllamaTagsPayload({
        models: [{ name: "llama3.2:latest" }, { name: "mistral" }],
      }),
    ).toEqual([
      { id: "llama3.2:latest", label: "llama3.2:latest" },
      { id: "mistral", label: "mistral" },
    ]);
  });

  it("parses OpenAI models list", () => {
    expect(
      parseOpenAiModelsPayload({
        data: [{ id: "gpt-4o-mini" }, { id: "local-model" }],
      }),
    ).toEqual([
      { id: "gpt-4o-mini", label: "gpt-4o-mini" },
      { id: "local-model", label: "local-model" },
    ]);
  });
});

describe("discoverRemoteModels", () => {
  it("merges unique ids from probe responses", async () => {
    const fetchJson = vi.fn(async (url: string) => {
      if (url.includes("/api/tags")) {
        return { models: [{ name: "llama3.2" }, { name: "shared" }] };
      }
      return { data: [{ id: "shared" }, { id: "proxy-model" }] };
    });

    const models = await discoverRemoteModels({
      baseUrl: "http://127.0.0.1:11434/v1",
      fetchJson,
    });

    expect(models.map((model) => model.id)).toEqual(["llama3.2", "shared", "proxy-model"]);
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });

  it("does not pass api key into returned models", async () => {
    const fetchJson = vi.fn(async (_url: string, headers: Record<string, string>) => {
      expect(headers.authorization).toBe("Bearer secret-key");
      return { models: [{ name: "llama3.2" }] };
    });
    const models = await discoverRemoteModels({
      baseUrl: "http://127.0.0.1:11434/v1",
      apiKey: "secret-key",
      fetchJson,
    });
    expect(JSON.stringify(models)).not.toContain("secret-key");
    expect(fetchJson).toHaveBeenCalled();
  });
});
