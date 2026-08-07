import Link from "next/link";
import type { FormEventHandler, ReactNode } from "react";
import { Space_Grotesk } from "next/font/google";
import { BrainMark } from "@/components/brain-mark";
import { cn } from "@/lib/utils";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-auth-display",
});

function BrandLockup({
  compact = false,
  subtitle,
}: {
  readonly compact?: boolean;
  readonly subtitle?: string;
}) {
  return (
    <div className={cn("auth-fade-up", compact ? "text-left" : "max-w-md")}>
      <Link
        className={cn(
          "group inline-flex outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent",
          compact ? "items-center gap-2.5" : "flex-col items-start gap-5",
        )}
        href="/"
      >
        <span
          className={cn(
            "border-border/50 bg-background/40 flex items-center justify-center border backdrop-blur-sm transition-transform duration-500 ease-out group-hover:-translate-y-0.5",
            compact ? "size-9 rounded-xl" : "auth-brand-mark size-20 rounded-[1.35rem] sm:size-24",
          )}
        >
          <BrainMark className={compact ? "size-5" : "size-12 sm:size-14"} />
        </span>
        <span
          className={cn(
            "text-foreground font-semibold tracking-[-0.045em]",
            compact ? "text-xl" : "text-5xl sm:text-6xl",
          )}
          style={{ fontFamily: "var(--font-auth-display), var(--font-sans)" }}
        >
          Brain
        </span>
      </Link>
      {subtitle ? (
        <p
          className={cn(
            "text-muted-foreground leading-relaxed",
            compact ? "mt-1 text-sm" : "mt-5 max-w-sm text-base",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function AuthStage({ children }: { readonly children: ReactNode }) {
  return (
    <div
      className={cn(
        "brain-auth-stage text-foreground relative grid min-h-dvh lg:grid-cols-2",
        display.variable,
      )}
    >
      <aside className="brain-auth-brand-pane relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12 xl:px-16 xl:py-14">
        <div aria-hidden className="brain-auth-atmosphere">
          <div className="brain-auth-orb brain-auth-orb-a" />
          <div className="brain-auth-orb brain-auth-orb-b" />
          <div className="brain-auth-grid" />
        </div>
        <div className="relative z-10">
          <BrandLockup subtitle="Self-hosted work assistant for your team — chats, tools, and connections on your host." />
        </div>
        <p className="text-muted-foreground relative z-10 text-xs tracking-wide">
          Runs on your machine.
        </p>
      </aside>

      <main className="bg-background relative flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 sm:py-14 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-8 lg:hidden">
            <BrandLockup compact subtitle="Sign in to continue on this host." />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function AuthPanel({
  children,
  className,
  onSubmit,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly onSubmit?: FormEventHandler<HTMLFormElement>;
}) {
  const classes = cn("auth-fade-up auth-fade-up-delay-1 w-full space-y-6", className);

  if (onSubmit) {
    return (
      <form className={classes} onSubmit={onSubmit}>
        {children}
      </form>
    );
  }

  return <div className={classes}>{children}</div>;
}

export function AuthPanelHeader({
  title,
  description,
}: {
  readonly title: string;
  readonly description?: ReactNode;
}) {
  return (
    <header className="border-border/60 space-y-2 border-b pb-5">
      <h1
        className="text-foreground text-2xl font-semibold tracking-tight sm:text-[1.75rem]"
        style={{ fontFamily: "var(--font-auth-display), var(--font-sans)" }}
      >
        {title}
      </h1>
      {description ? (
        <div className="text-muted-foreground text-sm leading-relaxed sm:text-[0.95rem]">
          {description}
        </div>
      ) : null}
    </header>
  );
}

export function AuthDivider({ label = "or" }: { readonly label?: string }) {
  return (
    <div className="relative py-0.5">
      <div aria-hidden className="border-border absolute inset-x-0 top-1/2 border-t" />
      <p className="bg-background text-muted-foreground relative mx-auto w-fit px-3 text-[11px] tracking-wide uppercase">
        {label}
      </p>
    </div>
  );
}

export function AuthFooterNote({ children }: { readonly children: ReactNode }) {
  return (
    <p className="text-muted-foreground border-border/60 border-t pt-5 text-sm leading-relaxed">
      {children}
    </p>
  );
}

export function AuthLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: ReactNode;
}) {
  return (
    <Link
      className="text-foreground decoration-foreground/25 hover:decoration-foreground/60 font-medium underline underline-offset-4 transition-colors"
      href={href}
    >
      {children}
    </Link>
  );
}
