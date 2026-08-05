"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  PLAYBOOKS_CHANGED_EVENT,
  readStoredPlaybooks,
  removePlaybook,
  upsertPlaybook,
  writeStoredPlaybooks,
  type Playbook,
} from "@/lib/chat/playbooks";

export function usePlaybooks() {
  const pathname = usePathname();
  const [playbooks, setPlaybooks] = useState<readonly Playbook[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setPlaybooks(readStoredPlaybooks());
      setReady(true);
    };
    sync();
    window.addEventListener(PLAYBOOKS_CHANGED_EVENT, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(PLAYBOOKS_CHANGED_EVENT, sync);
      window.removeEventListener("focus", sync);
    };
  }, [pathname]);

  const persist = useCallback((next: readonly Playbook[]) => {
    setPlaybooks(next);
    try {
      writeStoredPlaybooks(next);
    } catch {
      // Ignore quota / private mode failures; in-memory list still works this session.
    }
  }, []);

  const savePlaybook = useCallback(
    (input: { readonly id?: string; readonly label: string; readonly prompt: string }) => {
      const result = upsertPlaybook(playbooks, input);
      persist(result.playbooks);
      return result.playbook;
    },
    [persist, playbooks],
  );

  const deletePlaybook = useCallback(
    (id: string) => {
      persist(removePlaybook(playbooks, id));
    },
    [persist, playbooks],
  );

  return {
    playbooks,
    ready,
    savePlaybook,
    deletePlaybook,
  };
}
