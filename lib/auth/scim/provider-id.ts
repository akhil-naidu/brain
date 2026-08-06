const PREFIX = "brain-scim-";

export function scimProviderIdForWorkspace(workspaceId: string): string {
  return `${PREFIX}${workspaceId}`;
}

export function workspaceIdFromScimProviderId(providerId: string): string | null {
  if (!providerId.startsWith(PREFIX)) {
    return null;
  }
  const workspaceId = providerId.slice(PREFIX.length).trim();
  return workspaceId || null;
}

export function scimBasePath(): string {
  return "/api/auth/scim/v2";
}
