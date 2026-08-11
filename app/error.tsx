"use client";

import { StatusPage } from "@/components/system/status-page";

export default function AppError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <StatusPage
      actions={[
        { label: "Try again", onClick: reset },
        { href: "/", label: "Go home", variant: "outline" },
      ]}
      code="Error"
      description={
        <>
          Something went wrong while loading this page.
          {error.digest ? (
            <>
              {" "}
              <span className="text-muted-foreground/80 font-mono text-xs">Ref {error.digest}</span>
            </>
          ) : null}
        </>
      }
      title="Couldn’t load this page"
    />
  );
}
