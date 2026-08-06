"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BRAIN_PLAYBOOKS_STORAGE_KEY,
  PLAYBOOKS_CHANGED_EVENT,
  notifyPlaybooksChanged,
  readStoredPlaybooks,
  type Playbook,
} from "@/lib/chat/playbooks";
import {
  deletePlaybookApi,
  importPlaybooksApi,
  listPlaybooksApi,
  savePlaybookApi,
} from "@/lib/chat/playbooks-api";

const MIGRATED_KEY = "brain.playbooks.migrated.v1";

export function usePlaybooks() {
  const pathname = usePathname();
  const [playbooks, setPlaybooks] = useState<readonly Playbook[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      let listed = await listPlaybooksApi();
      if (
        listed.length === 0 &&
        typeof window !== "undefined" &&
        window.localStorage.getItem(MIGRATED_KEY) !== "1"
      ) {
        const legacy = readStoredPlaybooks();
        if (legacy.length > 0) {
          listed = await importPlaybooksApi(legacy);
          window.localStorage.setItem(MIGRATED_KEY, "1");
          window.localStorage.removeItem(BRAIN_PLAYBOOKS_STORAGE_KEY);
        } else {
          window.localStorage.setItem(MIGRATED_KEY, "1");
        }
      }
      setPlaybooks(listed);
    } catch {
      setPlaybooks([]);
    } finally {
      setReady(true);
    }
  }, []);

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
      const playbook = await savePlaybookApi(input);
      await refresh();
      notifyPlaybooksChanged();
      return playbook;
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
