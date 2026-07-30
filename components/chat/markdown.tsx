"use client";

import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { memo, type ComponentProps } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

const streamdownPlugins = { cjk, code, math, mermaid };

export type MarkdownProps = ComponentProps<typeof Streamdown>;

const markdownComponents: MarkdownProps["components"] = {
  h1: ({ children, className, ...props }) => (
    <h1
      className={cn("mt-7 mb-4 px-3 text-xl leading-7 font-medium tracking-normal", className)}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, className, ...props }) => (
    <h2
      className={cn("mt-6 mb-3 px-3 text-base leading-6 font-medium tracking-normal", className)}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, className, ...props }) => (
    <h3
      className={cn("mt-5 mb-2 px-3 text-sm leading-6 font-medium tracking-normal", className)}
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, className, ...props }) => (
    <h4
      className={cn("mt-4 mb-2 px-3 text-sm leading-6 font-medium tracking-normal", className)}
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, className, ...props }) => (
    <h5
      className={cn("mt-4 mb-2 px-3 text-xs leading-5 font-medium tracking-normal", className)}
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, className, ...props }) => (
    <h6
      className={cn(
        "text-muted-foreground mt-4 mb-2 px-3 text-xs leading-5 font-medium tracking-normal",
        className,
      )}
      {...props}
    >
      {children}
    </h6>
  ),
  p: ({ className, ...props }) => (
    <p className={cn("text-foreground px-3 text-[15px] leading-6", className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "text-foreground flex list-disc flex-col gap-1.5 px-3 pl-8 text-[15px] leading-6",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "text-foreground flex list-decimal flex-col gap-1.5 px-3 pl-8 text-[15px] leading-6",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("text-foreground pl-1 text-[15px] leading-6", className)} {...props} />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "border-border text-muted-foreground mx-3 border-l-2 pl-3 text-[15px] leading-6",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("border-border/70 mx-3 my-4", className)} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong className={cn("text-foreground font-medium", className)} {...props} />
  ),
  a: ({ children, className, ...props }) => (
    <a
      className={cn(
        "text-foreground decoration-border hover:decoration-foreground font-medium underline underline-offset-4 transition-colors",
        className,
      )}
      rel="noopener noreferrer"
      target="_blank"
      {...props}
    >
      {children}
    </a>
  ),
  inlineCode: ({ className, ...props }) => (
    <code
      className={cn(
        "border-border/70 bg-muted/40 text-foreground rounded-md border px-1.5 py-0.5 font-mono text-[0.92em]",
        className,
      )}
      {...props}
    />
  ),
};

export const Markdown = memo(function Markdown({ className, ...props }: MarkdownProps) {
  return (
    <Streamdown
      className={cn(
        "min-w-0 text-[15px] leading-6 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      components={markdownComponents}
      plugins={streamdownPlugins}
      {...props}
    />
  );
});
