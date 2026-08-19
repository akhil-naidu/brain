"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useChatShell } from "@/app/_components/chat-shell-context";
import { SettingsCardsSkeleton } from "@/components/loading/skeletons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  discoverCustomModels,
  fetchCustomModelsManage,
  setAllBuiltinModelsEnabled,
  setAllCustomModelsEnabled,
  setBuiltinModelEnabled,
  setCustomModelEnabled,
  updateCustomModel,
  type BuiltinModelDto,
  type CustomModelDto,
  type CustomModelWriteInput,
  type DiscoveredModelDto,
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

function withEnabledFlag<T extends { readonly enabled: boolean }>(model: T, enabled: boolean): T {
  if (model.enabled === enabled) {
    return model;
  }
  return Object.assign({}, model, { enabled });
}

function mapEnabled<T extends { readonly enabled: boolean; readonly id: string }>(
  models: readonly T[],
  enabled: boolean,
  modelId?: string,
): readonly T[] {
  return models.map((model) => {
    if (modelId !== undefined && model.id !== modelId) {
      return model;
    }
    return withEnabledFlag(model, enabled);
  });
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

function BuiltInModels({
  canManage,
  commandCodeConfigured,
  models,
  onToggle,
  onToggleAll,
  togglingId,
}: {
  readonly canManage: boolean;
  readonly commandCodeConfigured: boolean;
  readonly models: readonly BuiltinModelDto[];
  readonly onToggle: (modelId: string, enabled: boolean) => void;
  readonly onToggleAll: (enabled: boolean) => void;
  readonly togglingId: string | null;
}) {
  const enabledCount = models.filter((model) => model.enabled).length;
  const allEnabled = enabledCount === models.length && models.length > 0;
  const busy = togglingId !== null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 px-0.5">
        <div>
          <h2 className="text-sm font-medium tracking-tight">Built-in models</h2>
          <p className="text-muted-foreground text-xs">
            {canManage
              ? "Turn off models you do not want in this workspace's composer."
              : "Shown in the composer when enabled for this workspace."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage ? (
            <Button
              disabled={busy}
              onClick={() => {
                onToggleAll(!allEnabled);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {allEnabled ? "Turn all off" : "Turn all on"}
            </Button>
          ) : null}
          <span className="text-muted-foreground text-xs tabular-nums">
            {enabledCount}/{models.length}
          </span>
        </div>
      </div>
      {!commandCodeConfigured ? (
        <p className="text-muted-foreground text-xs">
          Command Code is not configured on this host, so built-ins stay out of chat until a key is
          set.
        </p>
      ) : null}
      <ul className="grid gap-2 sm:grid-cols-2">
        {models.map((model) => (
          <li
            className={cn(
              "border-border/80 bg-card/40 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3",
              !model.enabled && "opacity-70",
            )}
            key={model.id}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{model.label}</p>
              <p className="text-muted-foreground truncate text-xs">{model.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-muted-foreground text-[11px]">In chat</span>
              <Switch
                aria-label={`${model.label} in chat`}
                checked={model.enabled}
                disabled={!canManage || busy}
                onCheckedChange={(enabled) => {
                  onToggle(model.id, enabled);
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ModelsPage() {
  const { refreshModelCatalog } = useChatShell();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instanceModels, setInstanceModels] = useState<readonly CustomModelDto[]>([]);
  const [workspaceModels, setWorkspaceModels] = useState<readonly CustomModelDto[]>([]);
  const [builtinModels, setBuiltinModels] = useState<readonly BuiltinModelDto[]>([]);
  const [commandCodeConfigured, setCommandCodeConfigured] = useState(false);
  const [canManageInstance, setCanManageInstance] = useState(false);
  const [canManageWorkspace, setCanManageWorkspace] = useState(false);
  const [togglingBuiltinId, setTogglingBuiltinId] = useState<string | null>(null);
  const [togglingCustomId, setTogglingCustomId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomModelDto | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<readonly DiscoveredModelDto[]>([]);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  const canAddAnything = canManageInstance || canManageWorkspace;
  const canManageBuiltin = canManageInstance || canManageWorkspace;
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
        setBuiltinModels(data.builtinModels);
        setCommandCodeConfigured(data.commandCodeConfigured);
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

  const resetDiscovery = () => {
    setDiscovered([]);
    setDiscoverError(null);
    setDiscovering(false);
  };

  const openCreate = (scope: ModelScope = defaultCreateScope, preset?: FormState) => {
    if (scope === "instance" && !canManageInstance) {
      return;
    }
    if (scope === "workspace" && !canManageWorkspace) {
      return;
    }
    resetDiscovery();
    setEditor({ mode: "create", scope });
    setForm(preset ?? EMPTY_FORM);
  };

  const openEdit = (model: CustomModelDto) => {
    resetDiscovery();
    setEditor({ mode: "edit", scope: model.scope, model });
    setForm(formFromModel(model));
  };

  const closeEditor = () => {
    setEditor(null);
    setSaving(false);
    resetDiscovery();
  };

  const runDiscovery = async () => {
    setDiscovering(true);
    setDiscoverError(null);
    setDiscovered([]);
    try {
      const candidates = await discoverCustomModels({
        baseUrl: form.baseUrl,
        apiKey: form.apiKey.trim() ? form.apiKey : undefined,
      });
      setDiscovered(candidates);
    } catch (discoveryError) {
      setDiscoverError(
        discoveryError instanceof Error ? discoveryError.message : "Unable to discover models.",
      );
    } finally {
      setDiscovering(false);
    }
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

  const applyBuiltinModels = async (
    nextModels: readonly BuiltinModelDto[],
    persist: () => Promise<readonly BuiltinModelDto[]>,
    busyId: string,
  ) => {
    if (!canManageBuiltin) {
      return;
    }
    const previous = builtinModels;
    setBuiltinModels(nextModels);
    setTogglingBuiltinId(busyId);
    try {
      const next = await persist();
      setBuiltinModels(next);
      refreshModelCatalog();
    } catch (toggleError) {
      setBuiltinModels(previous);
      showToast({
        title:
          toggleError instanceof Error ? toggleError.message : "Unable to update built-in model.",
        variant: "error",
      });
    } finally {
      setTogglingBuiltinId(null);
    }
  };

  const toggleBuiltin = async (modelId: string, enabled: boolean) => {
    await applyBuiltinModels(
      mapEnabled(builtinModels, enabled, modelId),
      () => setBuiltinModelEnabled(modelId, enabled),
      modelId,
    );
  };

  const toggleAllBuiltins = async (enabled: boolean) => {
    await applyBuiltinModels(
      mapEnabled(builtinModels, enabled),
      () => setAllBuiltinModelsEnabled(enabled),
      "*",
    );
  };

  const applyCustomVisibility = async (
    nextInstance: readonly CustomModelDto[],
    nextWorkspace: readonly CustomModelDto[],
    persist: () => Promise<{
      readonly instanceModels: readonly CustomModelDto[];
      readonly workspaceModels: readonly CustomModelDto[];
    }>,
    busyId: string,
  ) => {
    if (!canManageBuiltin) {
      return;
    }
    const previousInstance = instanceModels;
    const previousWorkspace = workspaceModels;
    setInstanceModels(nextInstance);
    setWorkspaceModels(nextWorkspace);
    setTogglingCustomId(busyId);
    try {
      const next = await persist();
      setInstanceModels(next.instanceModels);
      setWorkspaceModels(next.workspaceModels);
      refreshModelCatalog();
    } catch (toggleError) {
      setInstanceModels(previousInstance);
      setWorkspaceModels(previousWorkspace);
      showToast({
        title:
          toggleError instanceof Error ? toggleError.message : "Unable to update custom model.",
        variant: "error",
      });
    } finally {
      setTogglingCustomId(null);
    }
  };

  const toggleCustom = async (modelId: string, enabled: boolean) => {
    await applyCustomVisibility(
      mapEnabled(instanceModels, enabled, modelId),
      mapEnabled(workspaceModels, enabled, modelId),
      () => setCustomModelEnabled(modelId, enabled),
      modelId,
    );
  };

  const toggleAllCustoms = async (enabled: boolean) => {
    await applyCustomVisibility(
      mapEnabled(instanceModels, enabled),
      mapEnabled(workspaceModels, enabled),
      () => setAllCustomModelsEnabled(enabled),
      "*",
    );
  };

  const canManageModel = (model: CustomModelDto) =>
    model.scope === "instance" ? canManageInstance : canManageWorkspace;
  const canManageCustomVisibility = canManageInstance || canManageWorkspace;
  const customBusy = togglingCustomId !== null;
  const customEnabledCount = models.filter((model) => model.enabled).length;
  const allCustomsEnabled = customEnabledCount === models.length && models.length > 0;

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
                  Choose which built-in models appear in chat, and add OpenAI-compatible endpoints.
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
                <div className="flex flex-wrap items-end justify-between gap-3 px-0.5">
                  <div>
                    <h2 className="text-sm font-medium tracking-tight">Your models</h2>
                    <p className="text-muted-foreground text-xs">
                      {canManageCustomVisibility
                        ? "Turn off models you do not want in this workspace's composer."
                        : "Shown in the composer when enabled for this workspace."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManageCustomVisibility ? (
                      <Button
                        disabled={customBusy}
                        onClick={() => {
                          void toggleAllCustoms(!allCustomsEnabled);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {allCustomsEnabled ? "Turn all off" : "Turn all on"}
                      </Button>
                    ) : null}
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {customEnabledCount}/{models.length}
                    </span>
                  </div>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {models.map((model) => {
                    const manageable = canManageModel(model);
                    return (
                      <li key={model.id}>
                        <div
                          className={cn(
                            "border-border/80 bg-card/40 hover:border-border group relative flex h-full flex-col rounded-2xl border p-4 transition-colors",
                            !model.enabled && "opacity-70",
                          )}
                        >
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

                          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                            <div className="flex flex-wrap items-center gap-2">
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
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-[11px]">In chat</span>
                              <Switch
                                aria-label={`${model.label} in chat`}
                                checked={model.enabled}
                                disabled={!canManageCustomVisibility || customBusy}
                                onCheckedChange={(enabled) => {
                                  void toggleCustom(model.id, enabled);
                                }}
                              />
                            </div>
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

            {builtinModels.length > 0 ? (
              <BuiltInModels
                canManage={canManageBuiltin}
                commandCodeConfigured={commandCodeConfigured}
                models={builtinModels}
                onToggle={(modelId, enabled) => {
                  void toggleBuiltin(modelId, enabled);
                }}
                onToggleAll={(enabled) => {
                  void toggleAllBuiltins(enabled);
                }}
                togglingId={togglingBuiltinId}
              />
            ) : null}
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
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium" htmlFor="model-base-url">
                  Base URL
                </label>
                <Button
                  disabled={discovering || !form.baseUrl.trim()}
                  onClick={() => void runDiscovery()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {discovering ? "Fetching…" : "Fetch models"}
                </Button>
              </div>
              <Input
                id="model-base-url"
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, baseUrl: event.target.value }));
                  setDiscovered([]);
                  setDiscoverError(null);
                }}
                placeholder="http://127.0.0.1:11434/v1"
                value={form.baseUrl}
              />
              {discoverError ? (
                <p className="text-destructive text-xs">{discoverError}</p>
              ) : discovered.length > 0 ? (
                <div className="border-border/70 max-h-36 space-y-1 overflow-y-auto rounded-xl border p-1.5">
                  {discovered.map((model) => (
                    <button
                      className={cn(
                        "hover:bg-muted/50 w-full cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                        form.providerModelId === model.id && "bg-muted text-foreground",
                      )}
                      key={model.id}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          providerModelId: model.id,
                          label: prev.label.trim() ? prev.label : model.label,
                        }));
                      }}
                      type="button"
                    >
                      <span className="font-mono">{model.id}</span>
                    </button>
                  ))}
                </div>
              ) : null}
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
