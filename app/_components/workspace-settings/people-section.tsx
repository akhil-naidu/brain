"use client";

import { useWorkspaceSettingsContext } from "@/app/_components/workspace-settings/workspace-settings-context";
import { SettingsRowsSkeleton } from "@/components/loading/skeletons";
import { SettingsPanel, SettingsSection } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { FieldSelect } from "@/components/ui/field";
import { memberLabel } from "@/lib/auth/workspace-settings/types";

export function WorkspacePeopleSection() {
  const {
    busy,
    canManage,
    isTeam,
    loading,
    members,
    onChangeRole,
    onRemove,
    onTransfer,
    ownerCount,
    pendingAction,
    viewerRole,
    viewerUserId,
  } = useWorkspaceSettingsContext();

  return (
    <SettingsSection
      description={
        isTeam
          ? "Owners and admins can change roles. Transfer ownership from the owner account."
          : "Personal workspaces are just for you. Create a team workspace to invite others."
      }
      title="Members"
    >
      <SettingsPanel>
        {loading ? (
          <SettingsRowsSkeleton rows={3} />
        ) : members.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            No members found for this workspace.
          </p>
        ) : (
          <ul className="divide-border/70 divide-y">
            {members.map((member) => {
              const isSelf = member.userId === viewerUserId;
              const canEditRole =
                isTeam &&
                canManage &&
                member.role !== "owner" &&
                !(viewerRole === "admin" && member.role === "admin" && !isSelf);
              const canRemove =
                isTeam &&
                (isSelf
                  ? !(member.role === "owner" && ownerCount <= 1)
                  : canManage &&
                    member.role !== "owner" &&
                    !(viewerRole === "admin" && member.role === "admin"));
              const canTransfer =
                isTeam && viewerRole === "owner" && !isSelf && member.role !== "owner";
              const rowBusy =
                pendingAction === `role:${member.userId}` ||
                pendingAction === `remove:${member.userId}` ||
                pendingAction === `transfer:${member.userId}`;
              return (
                <li
                  className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  key={member.userId}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                      {memberLabel(member).slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {memberLabel(member)}
                        {isSelf ? (
                          <span className="text-muted-foreground font-normal"> · you</span>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground text-xs capitalize">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {canEditRole ? (
                      <FieldSelect
                        aria-label={`Role for ${memberLabel(member)}`}
                        disabled={rowBusy}
                        onValueChange={(value) => {
                          if (value === "admin" || value === "member") {
                            void onChangeRole(member.userId, value);
                          }
                        }}
                        options={[
                          { value: "member", label: "Member" },
                          { value: "admin", label: "Admin" },
                        ]}
                        size="sm"
                        triggerClassName="w-[7.5rem]"
                        value={member.role === "admin" ? "admin" : "member"}
                      />
                    ) : null}
                    {canTransfer ? (
                      <Button
                        disabled={busy}
                        onClick={() => {
                          void onTransfer(member.userId);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {pendingAction === `transfer:${member.userId}`
                          ? "Transferring…"
                          : "Make owner"}
                      </Button>
                    ) : null}
                    {canRemove ? (
                      <Button
                        disabled={busy}
                        onClick={() => {
                          void onRemove(member.userId);
                        }}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {pendingAction === `remove:${member.userId}`
                          ? isSelf
                            ? "Leaving…"
                            : "Removing…"
                          : isSelf
                            ? "Leave"
                            : "Remove"}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SettingsPanel>
    </SettingsSection>
  );
}
