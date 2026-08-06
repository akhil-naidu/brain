import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { BrainAppShell } from "@/app/_components/brain-app-shell";
import { isBootstrapAllowed } from "@/lib/auth/bootstrap";
import { ensureAuthReady, getAuth } from "@/lib/auth/server";

export default async function AppLayout({ children }: { readonly children: ReactNode }) {
  await ensureAuthReady();
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    if (isBootstrapAllowed()) {
      redirect("/setup");
    }
    redirect("/sign-in?callbackUrl=/chat");
  }

  return <BrainAppShell>{children}</BrainAppShell>;
}
