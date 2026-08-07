"use client";

import { useWorkspaceSettingsContext } from "@/app/_components/workspace-settings/workspace-settings-context";
import { SettingsPanel, SettingsSection } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldSelect } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { inviteUrl } from "@/lib/auth/workspace-settings/types";

export function WorkspaceInvitesSection() {
  const {
    busy,
    canManage,
    copiedId,
    createdUrl,
    email,
    emailDeliveryNote,
    invites,
    markCopied,
    onCreateInvite,
    onRevokeInvite,
    pendingAction,
    role,
    setCreatedUrl,
    setEmail,
    setRole,
  } = useWorkspaceSettingsContext();

  return (
    <div className="space-y-8">
      {canManage ? (
        <SettingsSection
          description="Optional email binding sends an invite when SMTP is configured."
          title="Create invite"
        >
          <SettingsPanel className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="invite-email">Email (optional)</FieldLabel>
                <Input
                  id="invite-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="person@example.com"
                  type="email"
                  value={email}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                <FieldSelect
                  id="invite-role"
                  onValueChange={(value) => {
                    if (value === "admin" || value === "member") {
                      setRole(value);
                    }
                  }}
                  options={[
                    { value: "member", label: "Member" },
                    { value: "admin", label: "Admin" },
                  ]}
                  value={role}
                />
              </Field>
            </div>
            <Button
              disabled={busy}
              onClick={() => {
                void onCreateInvite();
              }}
              type="button"
            >
              {pendingAction === "invite-create" ? "Creating…" : "Create invite link"}
            </Button>
            {emailDeliveryNote ? (
              <p className="text-muted-foreground text-xs">{emailDeliveryNote}</p>
            ) : null}
            {createdUrl ? (
              <div className="bg-muted/40 space-y-1 rounded-lg p-3">
                <p className="text-xs font-medium">Invite link</p>
                <p className="font-mono text-xs break-all">{createdUrl}</p>
                <p className="text-muted-foreground text-xs">
                  {copiedId ? "Copied to clipboard." : "Copy and share this link."}
                </p>
              </div>
            ) : null}
          </SettingsPanel>
        </SettingsSection>
      ) : (
        <p className="text-muted-foreground text-sm">
          Only workspace owners and admins can create or revoke invites.
        </p>
      )}

      {canManage ? (
        <SettingsSection title="Outstanding invites">
          <SettingsPanel>
            {invites.length === 0 ? (
              <p className="text-muted-foreground px-4 py-6 text-sm">No active invites.</p>
            ) : (
              <ul className="divide-border/70 divide-y">
                {invites.map((invite) => (
                  <li
                    className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    key={invite.id}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium">
                        {invite.email ?? "Anyone with the link"}
                        <span className="text-muted-foreground font-normal"> · {invite.role}</span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Expires {new Date(invite.expiresAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        disabled={busy}
                        onClick={() => {
                          void (async () => {
                            try {
                              await navigator.clipboard.writeText(inviteUrl(invite.token));
                              markCopied(invite.id);
                            } catch {
                              setCreatedUrl(inviteUrl(invite.token));
                            }
                          })();
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {copiedId === invite.id ? "Copied" : "Copy link"}
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => {
                          void onRevokeInvite(invite.id);
                        }}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {pendingAction === `invite-revoke:${invite.id}` ? "Revoking…" : "Revoke"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SettingsPanel>
        </SettingsSection>
      ) : null}
    </div>
  );
}
