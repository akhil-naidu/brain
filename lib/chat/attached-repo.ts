export type AttachedRepo = {
  readonly owner: string;
  readonly name: string;
  readonly ref?: string;
};

const OWNER_REPO = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;
const OWNER_OR_NAME = /^[A-Za-z0-9_.-]+$/;

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
        // /owner/name/tree/branch... or /owner/name/blob/branch/path
        if ((parts[2] === "tree" || parts[2] === "blob") && parts[3]) {
          ref = parts[2] === "blob" ? parts[3] : parts.slice(3).join("/");
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

  return buildAttachedRepo({ owner, name, ref });
}

/** Build a repo from separate owner / name / ref fields. */
export function buildAttachedRepo(input: {
  readonly owner: string;
  readonly name: string;
  readonly ref?: string | null;
}): AttachedRepo | null {
  const owner = input.owner.trim();
  const name = input.name.trim();
  const ref = input.ref?.trim() || undefined;
  if (!owner || !name || name === "." || name === "..") {
    return null;
  }
  if (!OWNER_OR_NAME.test(owner) || !OWNER_OR_NAME.test(name)) {
    return null;
  }
  if (ref !== undefined && (ref.includes("..") || ref.startsWith("/"))) {
    return null;
  }
  return ref ? { owner, name, ref } : { owner, name };
}

export function formatAttachedRepo(repo: AttachedRepo): string {
  return repo.ref ? `${repo.owner}/${repo.name}@${repo.ref}` : `${repo.owner}/${repo.name}`;
}

/** Prefer a github.com URL when a ref is set so paste + branch stay obvious. */
export function formatAttachedRepoInput(repo: AttachedRepo): string {
  if (repo.ref) {
    return `https://github.com/${repo.owner}/${repo.name}/tree/${repo.ref}`;
  }
  return `${repo.owner}/${repo.name}`;
}

export function attachedRepoCloneUrl(repo: AttachedRepo): string {
  return `https://github.com/${repo.owner}/${repo.name}.git`;
}

export function attachedRepoStorageKey(chatId: string | null | undefined): string {
  return chatId?.trim() ? `brain.attachedRepo.${chatId.trim()}` : "brain.attachedRepo.ephemeral";
}
