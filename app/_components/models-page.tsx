"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useChatShell } from "@/app/_components/chat-shell-context";
import { SettingsCardsSkeleton } from "@/components/loading/skeletons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  createCustomModel,
  deleteCustomModel,
  fetchCustomModelsManage,
  updateCustomModel,
  type CatalogModelDto,
  type CustomModelDto,
  type CustomModelWriteInput,
} from "@/lib/chat/custom-models-api";
import { showToast } from "@/lib/ui/toast-store";
import { cn } from "@/lib/utils";

type ModelScope = "instance" | "workspace";

type EditorState = {
  readonly mode: "create" | "edit";
  readonly scope: ModelScope;
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

type Preset = {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly accent: string;
  readonly form: FormState;
};

const EMPTY_FORM: FormState = {
  label: "",
  description: "",
  baseUrl: "http://127.0.0.1:11434/v1",
  providerModelId: "",
  contextWindowTokens: "128000",
  apiKey: "",
};

const PRESETS: readonly Preset[] = [
  {
    id: "ollama",
    label: "Ollama",
    detail: "Running locally",
    accent: "from-emerald-500/20 to-transparent",
    form: {
      label: "Ollama",
      description: "Local Ollama",
      baseUrl: "http://127.0.0.1:11434/v1",
      providerModelId: "llama3.2",
      contextWindowTokens: "128000",
      apiKey: "",
    },
  },
  {
    id: "lmstudio",
    label: "LM Studio",
    detail: "Desktop app server",
    accent: "from-amber-500/20 to-transparent",
    form: {
      label: "LM Studio",
      description: "Local LM Studio",
      baseUrl: "http://127.0.0.1:1234/v1",
      providerModelId: "local-model",
      contextWindowTokens: "128000",
      apiKey: "",
    },
  },
  {
    id: "custom",
    label: "Custom /v1",
    detail: "Proxy, Azure, OpenRouter…",
    accent: "from-sky-500/20 to-transparent",
    form: {
      label: "",
      description: "",
      baseUrl: "https://",
      providerModelId: "",
      contextWindowTokens: "128000",
      apiKey: "",
    },
  },
];

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

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

function sourceLabel(source: CatalogModelDto["source"]): string {
  if (source === "command-code") {
    return "Built-in";
  }
  if (source === "instance") {
    return "Instance";
  }
  return "Workspace";
}

function AvailableInChat({ models }: { readonly models: readonly CatalogModelDto[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <div>
          <h2 className="text-sm font-medium tracking-tight">Available in chat</h2>
          <p className="text-muted-foreground text-xs">Shown in the composer model menu</p>
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">{models.length}</span>
      </div>
      {models.length === 0 ? (
        <p className="text-muted-foreground border-border/80 rounded-2xl border px-4 py-8 text-center text-sm">
          No models available yet.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <li
              className="border-border/80 bg-card/40 flex items-start justify-between gap-3 rounded-xl border px-3.5 py-3"
              key={model.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{model.label}</p>
                <p className="text-muted-foreground truncate text-xs">{model.description}</p>
              </div>
              <span className="text-muted-foreground shrink-0 text-[11px]">
                {sourceLabel(model.source)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ModelsPage() {
  const { catalogModels, refreshModelCatalog } = useChatShell();
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

  const canAddAnything = canManageInstance || canManageWorkspace;
  const defaultCreateScope: ModelScope = canManageWorkspace ? "workspace" : "instance";

  const models = useMemo(
    () => [...workspaceModels, ...instanceModels],
    [instanceModels, workspaceModels],
  );

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

  const openCreate = (scope: ModelScope = defaultCreateScope, preset?: FormState) => {
    if (scope === "instance" && !canManageInstance) {
      return;
    }
    if (scope === "workspace" && !canManageWorkspace) {
      return;
    }
    setEditor({ mode: "create", scope });
    setForm(preset ?? EMPTY_FORM);
  };

  const openEdit = (model: CustomModelDto) => {
    setEditor({ mode: "edit", scope: model.scope, model });
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

  const canManageModel = (model: CustomModelDto) =>
    model.scope === "instance" ? canManageInstance : canManageWorkspace;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <SettingsCardsSkeleton cards={3} />
        ) : error ? (
          <div className="border-border/80 rounded-2xl border px-5 py-8">
            <p className="text-destructive text-sm">{error}</p>
            <Button className="mt-3" onClick={load} size="sm" type="button" variant="outline">
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            <header className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-semibold tracking-tight">Models</h1>
                <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                  OpenAI-compatible models for chat. Added models show up in the composer.
                </p>
              </div>
              {canAddAnything && models.length > 0 ? (
                <Button onClick={() => openCreate()} size="sm" type="button">
                  <PlusIcon className="size-3.5" />
                  Add model
                </Button>
              ) : null}
            </header>

            {models.length === 0 ? (
              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-medium tracking-tight">Start with a model</h2>
                  <p className="text-muted-foreground text-xs">
                    {canAddAnything
                      ? "One click opens the form with sensible defaults."
                      : "You can view models, but only admins can add them."}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {PRESETS.map((preset) => (
                    <button
                      aria-label={`Add ${preset.label} model`}
                      className={cn(
                        "group border-border/80 relative overflow-hidden rounded-2xl border p-4 text-left transition-[transform,border-color,background-color]",
                        canAddAnything
                          ? "hover:border-border hover:bg-card/80 cursor-pointer active:scale-[0.99]"
                          : "cursor-not-allowed opacity-60",
                      )}
                      disabled={!canAddAnything}
                      key={preset.id}
                      onClick={() => openCreate(defaultCreateScope, preset.form)}
                      type="button"
                    >
                      <div
                        className={cn(
                          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
                          preset.accent,
                        )}
                      />
                      <div className="relative space-y-3">
                        <div className="bg-background/80 border-border/60 flex size-9 items-center justify-center rounded-xl border text-sm font-semibold tracking-tight">
                          {preset.label.slice(0, 1)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{preset.label}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs">{preset.detail}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <section className="space-y-3">
                <div className="flex items-baseline justify-between gap-3 px-0.5">
                  <h2 className="text-sm font-medium tracking-tight">Your models</h2>
                  <p className="text-muted-foreground text-xs tabular-nums">{models.length}</p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {models.map((model) => {
                    const manageable = canManageModel(model);
                    return (
                      <li key={model.id}>
                        <div className="border-border/80 bg-card/40 hover:border-border group relative flex h-full flex-col rounded-2xl border p-4 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1 pr-8">
                              <p className="truncate text-sm font-medium tracking-tight">
                                {model.label}
                              </p>
                              <p className="text-muted-foreground truncate font-mono text-xs">
                                {model.providerModelId}
                              </p>
                            </div>
                            {manageable ? (
                              <div className="absolute top-2.5 right-2.5">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      aria-label={`${model.label} actions`}
                                      className="opacity-70 group-hover:opacity-100"
                                      size="icon-sm"
                                      type="button"
                                      variant="ghost"
                                    >
                                      <MoreHorizontalIcon className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-36">
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        openEdit(model);
                                      }}
                                    >
                                      <PencilIcon className="size-3.5" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        setDeleteTarget(model);
                                      }}
                                      variant="destructive"
                                    >
                                      <Trash2Icon className="size-3.5" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ) : null}
                          </div>

                          <p className="text-muted-foreground mt-3 truncate text-xs">
                            {hostFromUrl(model.baseUrl)}
                          </p>

                          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                model.scope === "instance"
                                  ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                                  : "bg-violet-500/10 text-violet-700 dark:text-violet-300",
                              )}
                            >
                              {model.scope === "instance" ? "All workspaces" : "This workspace"}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              {model.hasApiKey ? "Key saved" : "No key"}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}

                  {canAddAnything ? (
                    <li>
                      <button
                        className="border-border/70 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/20 flex h-full min-h-[8.5rem] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-sm transition-colors"
                        onClick={() => openCreate()}
                        type="button"
                      >
                        <PlusIcon className="size-4" />
                        Add another
                      </button>
                    </li>
                  ) : null}
                </ul>
              </section>
            )}

            <AvailableInChat models={catalogModels} />
          </div>
        )}
      </div>

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
            <DialogTitle>{editor?.mode === "edit" ? "Edit model" : "Add model"}</DialogTitle>
            <DialogDescription>
              OpenAI-compatible chat completions — base URL, model id, optional API key.
            </DialogDescription>
          </DialogHeader>

          {editor?.mode === "create" && canManageInstance && canManageWorkspace ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">Who can use this?</p>
              <div className="border-border/80 bg-muted/35 grid grid-cols-2 gap-0.5 rounded-xl border p-1">
                <button
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-2.5 text-left transition-colors",
                    editor.scope === "workspace"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setEditor({ mode: "create", scope: "workspace" })}
                  type="button"
                >
                  <p className="text-sm font-medium">This workspace</p>
                  <p className="text-[11px] opacity-80">Only members here</p>
                </button>
                <button
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-2.5 text-left transition-colors",
                    editor.scope === "instance"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setEditor({ mode: "create", scope: "instance" })}
                  type="button"
                >
                  <p className="text-sm font-medium">Entire instance</p>
                  <p className="text-[11px] opacity-80">Every workspace</p>
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="model-label">
                Display name
              </label>
              <Input
                id="model-label"
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="Ollama"
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="model-provider-id">
                  Model id
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
                  Context window
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
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="model-api-key">
                API key{" "}
                {editor?.mode === "edit" && editor.model?.hasApiKey
                  ? "(leave blank to keep)"
                  : "(optional)"}
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
            <DialogTitle>Remove model?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `“${deleteTarget.label}” will be removed from the chat model list.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteTarget(null)} type="button" variant="outline">
              Cancel
            </Button>
            <Button onClick={() => void confirmDelete()} type="button">
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
