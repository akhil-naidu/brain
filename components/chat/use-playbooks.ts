"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import {
  BRAIN_PLAYBOOKS_LEGACY_CLAIM_KEY,
  BRAIN_PLAYBOOKS_STORAGE_KEY,
  PLAYBOOKS_CHANGED_EVENT,
  decideLegacyPlaybookImport,
  notifyPlaybooksChanged,
  playbooksMigratedStorageKey,
  readStoredPlaybooks,
  type Playbook,
} from "@/lib/chat/playbooks";
import {
  deletePlaybookApi,
  importPlaybooksApi,
  listPlaybooksApi,
  savePlaybookApi,
} from "@/lib/chat/playbooks-api";

export function usePlaybooks() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id ?? null;
  const [playbooks, setPlaybooks] = useState<readonly Playbook[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setPlaybooks([]);
      setReady(false);
      return;
    }

    try {
      let listed = await listPlaybooksApi();
      if (typeof window !== "undefined") {
        const migratedKey = playbooksMigratedStorageKey(userId);
        const decision = decideLegacyPlaybookImport({
          userId,
          serverEmpty: listed.length === 0,
          legacy: readStoredPlaybooks(),
          migratedFlag: window.localStorage.getItem(migratedKey),
          claimUserId: window.localStorage.getItem(BRAIN_PLAYBOOKS_LEGACY_CLAIM_KEY),
        });
        if (decision.action === "import") {
          window.localStorage.setItem(BRAIN_PLAYBOOKS_LEGACY_CLAIM_KEY, userId);
          listed = await importPlaybooksApi(decision.playbooks);
          window.localStorage.setItem(migratedKey, "1");
          window.localStorage.removeItem(BRAIN_PLAYBOOKS_STORAGE_KEY);
        } else if (decision.action === "mark_done") {
          window.localStorage.setItem(migratedKey, "1");
        }
      }
      setPlaybooks(listed);
    } catch {
      setPlaybooks([]);
    } finally {
      setReady(true);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
    const sync = () => {
      void refresh();
    };
    window.addEventListener(PLAYBOOKS_CHANGED_EVENT, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(PLAYBOOKS_CHANGED_EVENT, sync);
      window.removeEventListener("focus", sync);
    };
  }, [pathname, refresh]);

  const savePlaybook = useCallback(
    async (input: { readonly id?: string; readonly label: string; readonly prompt: string }) => {
      await savePlaybookApi(input);
      await refresh();
      notifyPlaybooksChanged();
    },
    [refresh],
  );

  const deletePlaybook = useCallback(
    async (id: string) => {
      await deletePlaybookApi(id);
      await refresh();
      notifyPlaybooksChanged();
    },
    [refresh],
  );

  return {
    playbooks,
    ready,
    savePlaybook,
    deletePlaybook,
  };
}
