"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readStoredPlaybooks,
  removePlaybook,
  upsertPlaybook,
  writeStoredPlaybooks,
  type Playbook,
} from "@/lib/chat/playbooks";

export function usePlaybooks() {
  const [playbooks, setPlaybooks] = useState<readonly Playbook[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPlaybooks(readStoredPlaybooks());
    setReady(true);
  }, []);

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
