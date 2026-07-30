import type { EveAuthorizationPart } from "eve/react";
import { ExternalLinkIcon, PlugIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function getSafeExternalUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function formatExpiry(expiresAt: string): string {
  const date = new Date(expiresAt);
  return Number.isNaN(date.getTime()) ? expiresAt : date.toLocaleString();
}

export function AuthorizationPart({ part }: { readonly part: EveAuthorizationPart }) {
  if (part.state === "completed") {
    return (
      <p className="text-muted-foreground text-sm">
        {part.outcome === "authorized"
          ? `${part.displayName} connected.`
          : `${part.displayName} authorization ${part.outcome}.`}
        {part.reason ? ` ${part.reason}` : ""}
      </p>
    );
  }

  const challenge = part.authorization;
  const rawUrl = challenge?.url;
  const safeUrl = getSafeExternalUrl(rawUrl);

  return (
    <div
      aria-live="polite"
      className="border-border/70 bg-muted/20 w-full max-w-md rounded-lg border p-3 text-sm shadow-sm"
    >
      <div className="flex gap-3">
        <span className="border-border bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border">
          <PlugIcon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-foreground font-medium">Connect {part.displayName}</p>
          <p className="text-muted-foreground mt-1">{part.description}</p>
          {challenge?.instructions ? (
            <p className="text-muted-foreground mt-2 whitespace-pre-wrap">
              {challenge.instructions}
            </p>
          ) : null}
          {challenge?.userCode ? (
            <p className="text-foreground mt-2 font-mono text-xs">Code: {challenge.userCode}</p>
          ) : null}
          {challenge?.expiresAt ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Expires: {formatExpiry(challenge.expiresAt)}
            </p>
          ) : null}
          {safeUrl ? (
            <div className="mt-2.5">
              <Button asChild size="xs" type="button">
                <a href={safeUrl} rel="noopener noreferrer" target="_blank">
                  Connect
                  <ExternalLinkIcon aria-hidden="true" className="size-3" />
                </a>
              </Button>
            </div>
          ) : rawUrl ? (
            <div className="mt-2">
              <p className="text-destructive text-xs">This authorization URL cannot be opened.</p>
              <p className="text-muted-foreground mt-1 text-xs break-all">{rawUrl}</p>
            </div>
          ) : (
            <p className="text-muted-foreground mt-2 text-xs">
              No authorization link was provided.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
