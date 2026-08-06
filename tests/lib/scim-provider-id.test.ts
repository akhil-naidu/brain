import { describe, expect, it } from "vitest";
import {
  scimBasePath,
  scimProviderIdForWorkspace,
  workspaceIdFromScimProviderId,
} from "@/lib/auth/scim/provider-id";

describe("scim provider id helpers", () => {
  it("round-trips workspace id", () => {
    const workspaceId = "ws_abc-123";
    const providerId = scimProviderIdForWorkspace(workspaceId);
    expect(providerId).toBe("brain-scim-ws_abc-123");
    expect(workspaceIdFromScimProviderId(providerId)).toBe(workspaceId);
  });

  it("rejects unrelated provider ids", () => {
    expect(workspaceIdFromScimProviderId("acme-oidc")).toBeNull();
    expect(workspaceIdFromScimProviderId("brain-scim-")).toBeNull();
  });

  it("exposes SCIM base path", () => {
    expect(scimBasePath()).toBe("/api/auth/scim/v2");
  });
});
