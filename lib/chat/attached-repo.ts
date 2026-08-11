export type AttachedRepo = {
  readonly owner: string;
  readonly name: string;
  readonly ref?: string;
};

const OWNER_REPO = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;

/**
 * Parse `owner/repo`, `owner/repo@ref`, or a github.com URL into an attachment.
 */
export function parseAttachedRepo(input: string | null | undefined): AttachedRepo | null {
  if (!input) {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  let owner = "";
  let name = "";
  let ref: string | undefined;

  const atIndex = trimmed.indexOf("@");
  const withoutAt =
    atIndex > 0 && !trimmed.includes("://") && !trimmed.includes("github.com")
      ? (() => {
          ref = trimmed.slice(atIndex + 1).trim() || undefined;
          return trimmed.slice(0, atIndex).trim();
        })()
      : trimmed;

  try {
    if (withoutAt.includes("github.com") || withoutAt.startsWith("http")) {
      const url = new URL(withoutAt.includes("://") ? withoutAt : `https://${withoutAt}`);
      if (!url.hostname.endsWith("github.com")) {
        return null;
      }
      const parts = url.pathname
        .replace(/\.git$/i, "")
        .split("/")
        .filter(Boolean);
      if (parts.length < 2) {
        return null;
      }
      owner = parts[0] ?? "";
      name = parts[1] ?? "";
      if (!ref) {
        // /owner/name/tree/branch...
        if (parts[2] === "tree" && parts[3]) {
          ref = parts.slice(3).join("/");
        }
      }
    } else {
      const match = OWNER_REPO.exec(withoutAt);
      if (!match) {
        return null;
      }
      owner = match[1] ?? "";
      name = match[2] ?? "";
    }
  } catch {
    return null;
  }

  if (!owner || !name || name === "." || name === "..") {
    return null;
  }

  return ref ? { owner, name, ref } : { owner, name };
}

export function formatAttachedRepo(repo: AttachedRepo): string {
  return repo.ref ? `${repo.owner}/${repo.name}@${repo.ref}` : `${repo.owner}/${repo.name}`;
}

export function attachedRepoCloneUrl(repo: AttachedRepo): string {
  return `https://github.com/${repo.owner}/${repo.name}.git`;
}

export function attachedRepoStorageKey(chatId: string | null | undefined): string {
  return chatId?.trim() ? `brain.attachedRepo.${chatId.trim()}` : "brain.attachedRepo.ephemeral";
}
