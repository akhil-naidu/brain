"use client";

import { LogOutIcon, SettingsIcon, ShieldIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { WORKSPACES_CHANGED_EVENT } from "@/lib/auth/workspace-events";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconTooltip } from "@/components/ui/tooltip";

function userInitial(name: string | null | undefined, email: string | null | undefined): string {
  const source = name?.trim() || email?.trim() || "?";
  return source.slice(0, 1).toUpperCase();
}

export function UserProfileMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [mounted, setMounted] = useState(false);
  const [isInstanceAdmin, setIsInstanceAdmin] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshAccess = useCallback(async () => {
    try {
      const response = await fetch("/api/workspaces");
      if (!response.ok) {
        return;
      }
      const data: unknown = await response.json();
      if (typeof data !== "object" || data === null) {
        return;
      }
      setIsInstanceAdmin("isInstanceAdmin" in data && Boolean(data.isInstanceAdmin));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refreshAccess();
  }, [pathname, refreshAccess]);

  useEffect(() => {
    const onChanged = () => {
      void refreshAccess();
    };
    window.addEventListener(WORKSPACES_CHANGED_EVENT, onChanged);
    window.addEventListener("focus", onChanged);
    return () => {
      window.removeEventListener(WORKSPACES_CHANGED_EVENT, onChanged);
      window.removeEventListener("focus", onChanged);
    };
  }, [refreshAccess]);

  const user = mounted ? session?.user : undefined;
  const displayName = user?.name?.trim() || user?.email?.trim() || "Account";
  const email = user?.email?.trim() || null;
  const initial = userInitial(user?.name, user?.email);

  return (
    <DropdownMenu>
      <IconTooltip label={displayName} side="bottom">
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Account menu"
            className="text-muted-foreground hover:text-foreground size-8 rounded-full p-0"
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <span className="bg-primary/12 text-foreground flex size-7 items-center justify-center rounded-full text-[11px] font-semibold">
              {initial}
            </span>
          </Button>
        </DropdownMenuTrigger>
      </IconTooltip>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-2.5 py-0.5">
            <span className="bg-primary/12 text-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              {email && email !== displayName ? (
                <p className="text-muted-foreground truncate text-xs">{email}</p>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            aria-current={pathname.startsWith("/workspaces/settings") ? "page" : undefined}
            href="/workspaces/settings"
          >
            <SettingsIcon className="size-4" />
            Workspace settings
          </Link>
        </DropdownMenuItem>
        {isInstanceAdmin ? (
          <DropdownMenuItem asChild>
            <Link
              aria-current={pathname.startsWith("/settings/instance") ? "page" : undefined}
              href="/settings/instance"
            >
              <ShieldIcon className="size-4" />
              Instance settings
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signingOut}
          onSelect={() => {
            void (async () => {
              setSigningOut(true);
              try {
                await authClient.signOut();
                router.replace("/sign-in");
                router.refresh();
              } finally {
                setSigningOut(false);
              }
            })();
          }}
        >
          <LogOutIcon className="size-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
