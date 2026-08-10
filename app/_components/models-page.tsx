"use client";

import { useCallback, useEffect, useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useChatShell } from "@/app/_components/chat-shell-context";
import { SettingsCardsSkeleton } from "@/components/loading/skeletons";
import {
  SettingsBadge,
  SettingsPanel,
  SettingsSection,
  SettingsShell,
} from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createCustomModel,
  deleteCustomModel,
  fetchCustomModelsManage,
  updateCustomModel,
  type CustomModelDto,
  type CustomModelWriteInput,
} from "@/lib/chat/custom-models-api";
import { showToast } from "@/lib/ui/toast-store";

type EditorState = {
  readonly mode: "create" | "edit";
  readonly scope: "instance" | "workspace";
  readonly model?: CustomModelDto;
};

type FormState = {
  label: string;
  description: string;
  baseUrl: string;
  providerModelId: string;
  contextWindowTokens: string;
  apiKey: string;
};

const EMPTY_FORM: FormState = {
  label: "",
  description: "",
  baseUrl: "http://127.0.0.1:11434/v1",
  providerModelId: "",
  contextWindowTokens: "128000",
  apiKey: "",
};

function formFromModel(model: CustomModelDto): FormState {
  return {
    label: model.label,
    description: model.description,
    baseUrl: model.baseUrl,
    providerModelId: model.providerModelId,
    contextWindowTokens: String(model.contextWindowTokens),
    apiKey: "",
  };
}

function ModelRows({
  models,
  canManage,
  onEdit,
  onDelete,
}: {
  readonly models: readonly CustomModelDto[];
  readonly canManage: boolean;
  readonly onEdit: (model: CustomModelDto) => void;
  readonly onDelete: (model: CustomModelDto) => void;
}) {
  if (models.length === 0) {
    return <p className="text-muted-foreground text-sm">No custom models yet.</p>;
  }

  return (
    <ul className="divide-border divide-y">
      {models.map((model) => (
        <li className="flex items-start justify-between gap-3 py-3" key={model.id}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{model.label}</span>
              {model.hasApiKey ? <SettingsBadge>API key set</SettingsBadge> : null}
            </div>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {model.providerModelId} · {model.baseUrl}
            </p>
            {model.description.trim() ? (
              <p className="text-muted-foreground mt-1 text-xs">{model.description}</p>
            ) : null}
          </div>
          {canManage ? (
            <div className="flex shrink-0 gap-1">
              <Button
                aria-label={`Edit ${model.label}`}
                onClick={() => onEdit(model)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <PencilIcon className="size-3.5" />
              </Button>
              <Button
                aria-label={`Delete ${model.label}`}
                onClick={() => onDelete(model)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ModelsPage() {
  const { refreshModelCatalog } = useChatShell();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instanceModels, setInstanceModels] = useState<readonly CustomModelDto[]>([]);
  const [workspaceModels, setWorkspaceModels] = useState<readonly CustomModelDto[]>([]);
  const [canManageInstance, setCanManageInstance] = useState(false);
  const [canManageWorkspace, setCanManageWorkspace] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomModelDto | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await fetchCustomModelsManage();
        setInstanceModels(data.instanceModels);
        setWorkspaceModels(data.workspaceModels);
        setCanManageInstance(data.capabilities.canManageInstance);
        setCanManageWorkspace(data.capabilities.canManageWorkspace);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load models.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = (scope: "instance" | "workspace") => {
    setEditor({ mode: "create", scope });
    setForm(EMPTY_FORM);
  };

  const openEdit = (scope: "instance" | "workspace", model: CustomModelDto) => {
    setEditor({ mode: "edit", scope, model });
    setForm(formFromModel(model));
  };

  const closeEditor = () => {
    setEditor(null);
    setSaving(false);
  };

  const submitEditor = async () => {
    if (!editor) {
      return;
    }
    const contextWindowTokens = Number(form.contextWindowTokens);
    if (!Number.isInteger(contextWindowTokens) || contextWindowTokens <= 0) {
      showToast({ title: "Context window must be a positive integer.", variant: "error" });
      return;
    }

    const payload: CustomModelWriteInput = {
      label: form.label,
      description: form.description,
      baseUrl: form.baseUrl,
      providerModelId: form.providerModelId,
      contextWindowTokens,
      apiKey: form.apiKey.trim() ? form.apiKey : undefined,
    };

    setSaving(true);
    try {
      if (editor.mode === "create") {
        await createCustomModel(editor.scope, payload);
        showToast({ title: "Model added.", variant: "success" });
      } else if (editor.model) {
        await updateCustomModel(editor.model.id, payload);
        showToast({ title: "Model updated.", variant: "success" });
      }
      closeEditor();
      load();
      refreshModelCatalog();
    } catch (saveError) {
      showToast({
        title: saveError instanceof Error ? saveError.message : "Unable to save model.",
        variant: "error",
      });
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      await deleteCustomModel(deleteTarget.id);
      showToast({ title: "Model deleted.", variant: "success" });
      setDeleteTarget(null);
      load();
      refreshModelCatalog();
    } catch (deleteError) {
      showToast({
        title: deleteError instanceof Error ? deleteError.message : "Unable to delete model.",
        variant: "error",
      });
    }
  };

  return (
    <SettingsShell
      description="Add OpenAI-compatible models for this workspace or the whole Brain instance."
      title="Models"
    >
      {loading ? (
        <SettingsPanel className="p-4">
          <SettingsCardsSkeleton cards={3} />
        </SettingsPanel>
      ) : error ? (
        <SettingsPanel className="p-4">
          <p className="text-destructive text-sm">{error}</p>
          <Button className="mt-3" onClick={load} type="button" variant="outline">
            Retry
          </Button>
        </SettingsPanel>
      ) : (
        <div className="flex flex-col gap-4">
          <SettingsPanel>
            <SettingsSection
              description="Visible in every workspace. Only the instance admin can change these."
              title="Instance models"
            >
              <div className="flex items-center justify-between gap-2 pb-2">
                <p className="text-muted-foreground text-xs">
                  {canManageInstance
                    ? "You can manage instance models."
                    : "Read-only for your role."}
                </p>
                {canManageInstance ? (
                  <Button onClick={() => openCreate("instance")} size="sm" type="button">
                    <PlusIcon className="size-3.5" />
                    Add
                  </Button>
                ) : null}
              </div>
              <ModelRows
                canManage={canManageInstance}
                models={instanceModels}
                onDelete={setDeleteTarget}
                onEdit={(model) => openEdit("instance", model)}
              />
            </SettingsSection>
          </SettingsPanel>

          <SettingsPanel>
            <SettingsSection
              description="Only members of the active workspace see these in the chat picker."
              title="Workspace models"
            >
              <div className="flex items-center justify-between gap-2 pb-2">
                <p className="text-muted-foreground text-xs">
                  {canManageWorkspace
                    ? "You can manage models for this workspace."
                    : "Ask a workspace admin to add models."}
                </p>
                {canManageWorkspace ? (
                  <Button onClick={() => openCreate("workspace")} size="sm" type="button">
                    <PlusIcon className="size-3.5" />
                    Add
                  </Button>
                ) : null}
              </div>
              <ModelRows
                canManage={canManageWorkspace}
                models={workspaceModels}
                onDelete={setDeleteTarget}
                onEdit={(model) => openEdit("workspace", model)}
              />
            </SettingsSection>
          </SettingsPanel>

          <SettingsPanel>
            <SettingsSection
              description="Built-in Command Code models appear in chat when the host API key is configured."
              title="Chat picker"
            >
              <p className="text-muted-foreground text-sm">
                The composer merges instance models, workspace models, and curated Command Code
                models. Open a chat and use the model menu to switch.
              </p>
            </SettingsSection>
          </SettingsPanel>
        </div>
      )}

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            closeEditor();
          }
        }}
        open={editor !== null}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editor?.mode === "edit" ? "Edit model" : "Add custom model"}</DialogTitle>
            <DialogDescription>
              OpenAI-compatible chat completions endpoint (Ollama, LM Studio, proxies, etc.).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="model-label">
                Label
              </label>
              <Input
                id="model-label"
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                value={form.label}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="model-base-url">
                Base URL
              </label>
              <Input
                id="model-base-url"
                onChange={(event) => setForm((prev) => ({ ...prev, baseUrl: event.target.value }))}
                placeholder="http://127.0.0.1:11434/v1"
                value={form.baseUrl}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="model-provider-id">
                Provider model id
              </label>
              <Input
                id="model-provider-id"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, providerModelId: event.target.value }))
                }
                placeholder="llama3.2"
                value={form.providerModelId}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="model-context">
                Context window (tokens)
              </label>
              <Input
                id="model-context"
                inputMode="numeric"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, contextWindowTokens: event.target.value }))
                }
                value={form.contextWindowTokens}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="model-description">
                Description (optional)
              </label>
              <Input
                id="model-description"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                value={form.description}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="model-api-key">
                API key {editor?.mode === "edit" ? "(leave blank to keep)" : "(optional)"}
              </label>
              <Input
                autoComplete="off"
                id="model-api-key"
                onChange={(event) => setForm((prev) => ({ ...prev, apiKey: event.target.value }))}
                type="password"
                value={form.apiKey}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={closeEditor} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void submitEditor()} type="button">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        open={deleteTarget !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete model?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Remove “${deleteTarget.label}” from ${deleteTarget.scope === "instance" ? "the instance" : "this workspace"}.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteTarget(null)} type="button" variant="outline">
              Cancel
            </Button>
            <Button onClick={() => void confirmDelete()} type="button" variant="default">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsShell>
  );
}
