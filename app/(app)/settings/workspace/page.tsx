import { redirect } from "next/navigation";

type SearchParams = Promise<{
  readonly tab?: string | string[];
}>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function LegacyWorkspaceSettingsRedirect({
  searchParams,
}: {
  readonly searchParams: SearchParams;
}) {
  const tab = firstParam((await searchParams).tab);
  if (tab === "security" || tab === "sso") {
    redirect("/workspaces/settings?tab=sso");
  }
  if (tab === "invites") {
    redirect("/workspaces/settings?tab=invites");
  }
  if (tab === "people") {
    redirect("/workspaces/settings?tab=people");
  }
  redirect("/workspaces/settings");
}
