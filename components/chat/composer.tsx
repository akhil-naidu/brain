"use client";

import {
  ArrowUpIcon,
  FileIcon,
  FileTextIcon,
  Loader2Icon,
  PaperclipIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ComposerCommandMenu,
  visibleComposerCommandItems,
} from "@/components/chat/composer-command-menu";
import { Button } from "@/components/ui/button";
import { IconTooltip, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  attachmentExtension,
  canSubmitChatTurn,
  CHAT_ATTACHMENT_ACCEPT,
  type PendingAttachment,
} from "@/lib/chat/attachments";
import {
  COMPOSER_COMMAND_GROUPS,
  type ComposerCommandGroup,
  type ComposerCommandItem,
} from "@/lib/chat/composer-commands";
import {
  clearComposerEditor,
  clearComposerTriggerRange,
  COMPOSER_MENTION_ATTR,
  COMPOSER_MENTION_REMOVE_ATTR,
  getComposerPlainState,
  isComposerEditorEmpty,
  removeComposerMentionElement,
  replaceTriggerWithMentionBadge,
  serializeComposerEditor,
  setComposerEditorPlainText,
} from "@/lib/chat/composer-rich-editor";
import { findComposerTrigger, type ComposerTrigger } from "@/lib/chat/composer-trigger";
import {
  type BrainChatMode,
  cycleBrainChatMode,
  DEFAULT_BRAIN_CHAT_MODE,
} from "@/lib/chat/chat-mode";
import { getChatMessageLength, MAX_CHAT_MESSAGE_CHARS } from "@/lib/chat/limits";
import { cn } from "@/lib/utils";

const EMPTY_ATTACHMENTS: readonly PendingAttachment[] = [];
const LENGTH_WARN_RATIO = 0.85;

const MODE_COMPOSER_CLASS: Record<BrainChatMode, string> = {
  ask: "border-[var(--brain-mode-ask-border)] bg-[var(--brain-mode-ask-muted)] has-[[data-chat-composer-input]:focus]:border-[var(--brain-mode-ask)] has-[[data-chat-composer-input]:focus]:bg-[var(--brain-mode-ask-muted)]",
  agent: "",
};

const MODE_SEND_CLASS: Record<BrainChatMode, string> = {
  ask: "bg-[var(--brain-mode-ask)] text-white hover:bg-[var(--brain-mode-ask)]/90 disabled:bg-[var(--brain-mode-ask-muted)] disabled:text-[var(--brain-mode-ask-foreground)]",
  agent:
    "bg-foreground text-background hover:bg-foreground/90 disabled:bg-foreground/12 disabled:text-muted-foreground",
};

function formatAttachmentSize(size: number): string {
  if (size < 1_024) {
    return `${size} B`;
  }
  if (size < 1_048_576) {
    return `${(size / 1_024).toFixed(1)} KB`;
  }
  return `${(size / 1_048_576).toFixed(1)} MB`;
}

function AttachmentGlyph({
  filename,
  mediaType,
}: {
  readonly filename: string;
  readonly mediaType: string;
}) {
  const extension = attachmentExtension(filename);
  const isImage = mediaType.startsWith("image/");
  const Icon = isImage ? FileIcon : FileTextIcon;
  const label = extension?.toUpperCase() ?? null;

  return (
    <span className="bg-background/80 text-muted-foreground border-border/60 flex size-8 shrink-0 flex-col items-center justify-center rounded-md border">
      <Icon className="size-3.5" />
      {label ? (
        <span className="mt-px text-[8px] leading-none font-semibold tracking-wide">{label}</span>
      ) : null}
    </span>
  );
}

const EMPTY_COMMAND_ITEMS: readonly ComposerCommandItem[] = [];

export function ChatComposer({
  attachments = EMPTY_ATTACHMENTS,
  className,
  commandItems = EMPTY_COMMAND_ITEMS,
  disabled = false,
  disabledReason,
  focusOnMount = true,
  footerStart,
  isBusy = false,
  isPreparing = false,
  maxLength = MAX_CHAT_MESSAGE_CHARS,
  mode = DEFAULT_BRAIN_CHAT_MODE,
  onAddFiles,
  onChange,
  onCommandAction,
  onFocusChange,
  onModeChange,
  onRemoveAttachment,
  onStop,
  onSubmit,
  placeholder = "Ask Brain anything…  (/ commands, @ mention)",
  value,
}: {
  readonly attachments?: readonly PendingAttachment[];
  readonly className?: string;
  readonly commandItems?: readonly ComposerCommandItem[];
  readonly disabled?: boolean;
  readonly disabledReason?: string;
  readonly focusOnMount?: boolean;
  readonly footerStart?: ReactNode;
  readonly isBusy?: boolean;
  readonly isPreparing?: boolean;
  readonly maxLength?: number;
  readonly mode?: BrainChatMode;
  readonly onAddFiles?: (files: readonly File[]) => void;
  readonly onChange: (value: string) => void;
  readonly onCommandAction?: (
    item: ComposerCommandItem,
    triggerKind: ComposerTrigger["kind"],
  ) => void | Promise<void>;
  /** Fires when the message textarea gains or loses focus (not toolbar menus). */
  readonly onFocusChange?: (focused: boolean) => void;
  readonly onModeChange?: (mode: BrainChatMode) => void;
  readonly onRemoveAttachment?: (id: string) => void;
  readonly onStop: () => void;
  readonly onSubmit: (value: string) => void | Promise<void>;
  readonly placeholder?: string;
  readonly value: string;
}) {
  const composerId = useId();
  const disabledReasonId = useId();
  const fileInputId = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEmittedValueRef = useRef(value);
  const [trigger, setTrigger] = useState<ComposerTrigger | null>(null);
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const [activeCommandGroup, setActiveCommandGroup] = useState<ComposerCommandGroup>("Connections");
  const [editorEmpty, setEditorEmpty] = useState(() => value.trim().length === 0);
  const triggerRef = useRef<ComposerTrigger | null>(null);
  triggerRef.current = trigger;
  const textareaDisabled = disabled || isBusy || isPreparing;
  const shouldFocusOnMountRef = useRef(focusOnMount && !textareaDisabled);
  const trimmedValue = value.trim();
  const messageLength = getChatMessageLength(trimmedValue);
  const isOverMaxLength = messageLength > maxLength;
  const showLengthHint = messageLength >= Math.floor(maxLength * LENGTH_WARN_RATIO);
  const canSubmit =
    canSubmitChatTurn(value, attachments) &&
    !disabled &&
    !isBusy &&
    !isPreparing &&
    !isOverMaxLength;
  const menuOpen = Boolean(trigger && commandItems.length > 0 && !textareaDisabled);
  const visibleCommands = trigger
    ? visibleComposerCommandItems(commandItems, trigger.query, activeCommandGroup)
    : EMPTY_COMMAND_ITEMS;

  const syncTriggerFromEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || textareaDisabled || commandItems.length === 0) {
      setTrigger(null);
      return;
    }
    const { text, caret } = getComposerPlainState(editor);
    const previous = triggerRef.current;
    const nextTrigger = findComposerTrigger(text, caret);
    const openedNew =
      Boolean(nextTrigger) &&
      (!previous || previous.kind !== nextTrigger?.kind || previous.start !== nextTrigger?.start);
    if (openedNew) {
      setActiveCommandGroup("Connections");
      setActiveCommandIndex(0);
    } else if (nextTrigger && previous && nextTrigger.query !== previous.query) {
      setActiveCommandIndex(0);
    }
    setTrigger(nextTrigger);
  }, [commandItems.length, textareaDisabled]);

  const emitEditorValue = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const next = serializeComposerEditor(editor);
    lastEmittedValueRef.current = next;
    setEditorEmpty(isComposerEditorEmpty(editor));
    onChange(next);
    syncTriggerFromEditor();
  }, [onChange, syncTriggerFromEditor]);

  useEffect(() => {
    if (!shouldFocusOnMountRef.current || document.activeElement !== document.body) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      editorRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    if (value === lastEmittedValueRef.current) {
      return;
    }
    // Parent cleared or replaced the draft (send / retry) — sync plain text.
    if (value.trim().length === 0) {
      clearComposerEditor(editor);
    } else {
      setComposerEditorPlainText(editor, value);
    }
    lastEmittedValueRef.current = value;
    setEditorEmpty(isComposerEditorEmpty(editor));
    setTrigger(null);
  }, [value]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    editor.style.height = "0px";
    editor.style.height = `${Math.min(editor.scrollHeight, 224)}px`;
  }, [value]);

  const submitValue = useCallback(() => {
    if (!canSubmitChatTurn(value, attachments) || disabled || isBusy || isPreparing) {
      return;
    }
    if (getChatMessageLength(value.trim()) > maxLength) {
      return;
    }
    const editor = editorRef.current;
    if (editor) {
      clearComposerEditor(editor);
      lastEmittedValueRef.current = "";
      setEditorEmpty(true);
    }
    setTrigger(null);
    void onSubmit(value);
  }, [attachments, disabled, isBusy, isPreparing, maxLength, onSubmit, value]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitValue();
    },
    [submitValue],
  );

  const selectCommand = useCallback(
    (item: ComposerCommandItem) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      const { text, caret } = getComposerPlainState(editor);
      const active = trigger ?? findComposerTrigger(text, caret);
      if (!active) {
        return;
      }

      const actionConsumesDraft =
        active.kind === "/" &&
        (item.action.type === "run-playbook" ||
          item.action.type === "navigate" ||
          item.action.type === "new-chat-in-project");

      const next = actionConsumesDraft
        ? clearComposerTriggerRange(editor, active)
        : replaceTriggerWithMentionBadge(editor, active, {
            itemId: item.id,
            kind: item.kind,
            label: item.label,
            mentionText: item.mentionText.trim(),
          });

      lastEmittedValueRef.current = next;
      setEditorEmpty(isComposerEditorEmpty(editor));
      onChange(next);
      setTrigger(null);
      editor.focus();
      syncTriggerFromEditor();

      void onCommandAction?.(item, active.kind);
    },
    [onChange, onCommandAction, syncTriggerFromEditor, trigger],
  );

  const handleEditorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      // Cursor-like mode cycle: Shift+Tab when the command menu is closed.
      if (event.key === "Tab" && event.shiftKey && onModeChange && !menuOpen && !disabled) {
        event.preventDefault();
        onModeChange(cycleBrainChatMode(mode, "next"));
        return;
      }

      if (menuOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          setTrigger(null);
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActiveCommandIndex((current) =>
            visibleCommands.length === 0 ? 0 : (current + 1) % visibleCommands.length,
          );
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setActiveCommandIndex((current) =>
            visibleCommands.length === 0
              ? 0
              : (current - 1 + visibleCommands.length) % visibleCommands.length,
          );
          return;
        }
        if (
          trigger?.query.length === 0 &&
          (event.key === "ArrowLeft" || event.key === "ArrowRight")
        ) {
          event.preventDefault();
          const currentIndex = Math.max(0, COMPOSER_COMMAND_GROUPS.indexOf(activeCommandGroup));
          const delta = event.key === "ArrowRight" ? 1 : -1;
          const nextGroup =
            COMPOSER_COMMAND_GROUPS[
              (currentIndex + delta + COMPOSER_COMMAND_GROUPS.length) %
                COMPOSER_COMMAND_GROUPS.length
            ] ?? activeCommandGroup;
          setActiveCommandGroup(nextGroup);
          setActiveCommandIndex(0);
          return;
        }
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          const item = visibleCommands[activeCommandIndex];
          if (item) {
            selectCommand(item);
          }
          return;
        }
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitValue();
      }
    },
    [
      activeCommandGroup,
      activeCommandIndex,
      disabled,
      menuOpen,
      mode,
      onModeChange,
      selectCommand,
      submitValue,
      trigger,
      visibleCommands,
    ],
  );

  const addFiles = useCallback(
    (fileList: FileList | readonly File[] | null | undefined) => {
      if (!fileList || !onAddFiles || textareaDisabled) {
        return;
      }
      const files = Array.from(fileList);
      if (files.length > 0) {
        onAddFiles(files);
      }
    },
    [onAddFiles, textareaDisabled],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      const files = event.clipboardData?.files;
      if (files && files.length > 0 && onAddFiles) {
        const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
        if (imageFiles.length > 0) {
          event.preventDefault();
          onAddFiles(imageFiles);
          return;
        }
      }

      // Keep mentions intact — paste as plain text at the caret.
      const pasted = event.clipboardData?.getData("text/plain");
      if (pasted == null) {
        return;
      }
      event.preventDefault();
      document.execCommand("insertText", false, pasted);
      emitEditorValue();
    },
    [emitEditorValue, onAddFiles],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!onAddFiles || textareaDisabled) {
        return;
      }
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) {
        return;
      }
      event.preventDefault();
      addFiles(files);
    },
    [addFiles, onAddFiles, textareaDisabled],
  );

  const form = (
    <form
      className={cn(
        "border-border/50 bg-muted/30 dark:bg-muted/25 has-[[data-chat-composer-input]:focus]:border-border/80 has-[[data-chat-composer-input]:focus]:bg-muted/40 dark:has-[[data-chat-composer-input]:focus]:bg-muted/35 relative min-w-0 rounded-3xl border shadow-md transition-[border-color,background-color,box-shadow] duration-300 ease-out has-[[data-chat-composer-input]:focus]:shadow-lg",
        MODE_COMPOSER_CLASS[mode],
        className,
      )}
      aria-describedby={disabledReason ? disabledReasonId : undefined}
      data-chat-composer
      data-chat-mode={mode}
      onSubmit={handleSubmit}
    >
      {menuOpen && trigger ? (
        <ComposerCommandMenu
          activeGroup={activeCommandGroup}
          activeIndex={activeCommandIndex}
          items={commandItems}
          onHoverIndex={setActiveCommandIndex}
          onSelect={selectCommand}
          onSelectGroup={(group) => {
            setActiveCommandGroup(group);
            setActiveCommandIndex(0);
          }}
          trigger={trigger}
        />
      ) : null}
      {attachments.length > 0 ? (
        <ul className="flex flex-wrap gap-2 px-3.5 pt-3.5 sm:px-4">
          {attachments.map((file) => (
            <li
              className="border-border/50 bg-background/50 flex max-w-full items-center gap-2 rounded-2xl border py-1.5 pr-1 pl-1.5"
              key={file.id}
            >
              {file.mediaType.startsWith("image/") ? (
                <Image
                  alt=""
                  className="size-8 shrink-0 rounded-md object-cover"
                  height={32}
                  src={file.dataUrl}
                  unoptimized
                  width={32}
                />
              ) : (
                <AttachmentGlyph filename={file.filename} mediaType={file.mediaType} />
              )}
              <span className="min-w-0">
                <span className="text-foreground block max-w-40 truncate text-xs font-medium">
                  {file.filename}
                </span>
                <span className="text-muted-foreground block text-[11px]">
                  {formatAttachmentSize(file.size)}
                </span>
              </span>
              {onRemoveAttachment ? (
                <button
                  aria-label={`Remove ${file.filename}`}
                  className="text-muted-foreground hover:bg-background/70 hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                  onClick={() => onRemoveAttachment(file.id)}
                  type="button"
                >
                  <XIcon className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <label className="sr-only" htmlFor={composerId}>
        Message Brain
      </label>
      <div className="relative">
        {editorEmpty ? (
          <div className="text-muted-foreground/50 pointer-events-none absolute inset-x-4 top-3.5 text-base leading-6 md:text-[15px]">
            {placeholder}
          </div>
        ) : null}
        <div
          aria-activedescendant={
            menuOpen ? `composer-command-option-${activeCommandIndex}` : undefined
          }
          aria-controls={menuOpen ? "composer-command-menu" : undefined}
          aria-describedby={disabledReason ? disabledReasonId : undefined}
          aria-disabled={textareaDisabled || undefined}
          aria-label="Message Brain"
          aria-multiline="true"
          aria-placeholder={placeholder}
          className={cn(
            "max-h-56 min-h-12 w-full overflow-y-auto bg-transparent px-4 pt-3.5 pb-2 text-base leading-6 break-words whitespace-pre-wrap transition-[min-height] duration-300 ease-out outline-none focus:min-h-16 md:text-[15px]",
            textareaDisabled && "cursor-not-allowed opacity-60",
          )}
          contentEditable={!textareaDisabled}
          data-chat-composer-input
          id={composerId}
          onBlur={() => {
            onFocusChange?.(false);
            window.setTimeout(() => {
              if (document.activeElement !== editorRef.current) {
                setTrigger(null);
              }
            }, 120);
          }}
          onClick={(event) => {
            const target = event.target;
            if (target instanceof Element) {
              const removeButton = target.closest(`[${COMPOSER_MENTION_REMOVE_ATTR}]`);
              if (removeButton) {
                const mention = removeButton.closest(`[${COMPOSER_MENTION_ATTR}]`);
                const editor = editorRef.current;
                if (mention instanceof HTMLElement && editor) {
                  const next = removeComposerMentionElement(editor, mention);
                  lastEmittedValueRef.current = next;
                  setEditorEmpty(isComposerEditorEmpty(editor));
                  onChange(next);
                  editor.focus();
                  syncTriggerFromEditor();
                }
                return;
              }
            }
            syncTriggerFromEditor();
          }}
          onMouseDown={(event) => {
            const target = event.target;
            if (target instanceof Element && target.closest(`[${COMPOSER_MENTION_REMOVE_ATTR}]`)) {
              // Keep editor focus / selection stable while removing the chip.
              event.preventDefault();
            }
          }}
          onDragOver={(event) => {
            if (onAddFiles && !textareaDisabled) {
              event.preventDefault();
            }
          }}
          onDrop={handleDrop}
          onFocus={() => {
            onFocusChange?.(true);
          }}
          onInput={() => {
            emitEditorValue();
          }}
          onKeyDown={handleEditorKeyDown}
          onKeyUp={(event) => {
            if (
              event.key === "ArrowUp" ||
              event.key === "ArrowDown" ||
              event.key === "ArrowLeft" ||
              event.key === "ArrowRight" ||
              event.key === "Enter" ||
              event.key === "Escape"
            ) {
              return;
            }
            syncTriggerFromEditor();
          }}
          onPaste={handlePaste}
          onSelect={() => {
            syncTriggerFromEditor();
          }}
          ref={editorRef}
          // contenteditable surfaces must use role=textbox (no native textarea equivalent).
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- rich mention chips require contentEditable
          role="textbox"
          suppressContentEditableWarning
          tabIndex={textareaDisabled ? -1 : 0}
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-2.5 pt-0.5 pb-2.5 sm:px-3">
        <div className="flex min-w-0 flex-1 scrollbar-none items-center gap-0.5 overflow-x-auto">
          {footerStart}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {showLengthHint ? (
            <span
              aria-live="polite"
              className={cn(
                "mr-0.5 text-[11px] font-medium tabular-nums",
                isOverMaxLength ? "text-destructive" : "text-muted-foreground/80",
              )}
            >
              {messageLength.toLocaleString("en-US")}/{maxLength.toLocaleString("en-US")}
            </span>
          ) : null}
          {onAddFiles ? (
            <>
              <input
                accept={CHAT_ATTACHMENT_ACCEPT}
                className="sr-only"
                disabled={textareaDisabled}
                id={fileInputId}
                multiple
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
                ref={fileInputRef}
                type="file"
              />
              <IconTooltip label="Attach image, PDF, or text/code" side="top">
                <button
                  aria-label="Attach file"
                  className="text-muted-foreground/65 hover:bg-background/45 hover:text-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-50"
                  disabled={textareaDisabled}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <PaperclipIcon className="size-4" />
                </button>
              </IconTooltip>
            </>
          ) : null}
          {isBusy ? (
            <IconTooltip label={disabledReason === "Stopping…" ? "Stopping…" : "Stop"} side="top">
              <Button
                aria-label={disabledReason === "Stopping…" ? "Stopping response" : "Stop response"}
                className="bg-foreground/12 text-foreground hover:bg-foreground/20 size-8 cursor-pointer rounded-full shadow-none"
                onClick={onStop}
                size="icon-sm"
                type="button"
              >
                <SquareIcon className="size-3 fill-current" />
              </Button>
            </IconTooltip>
          ) : isPreparing ? (
            <IconTooltip label="Preparing…" side="top">
              <Button
                aria-label="Preparing chat"
                className="bg-foreground/80 text-background size-8 rounded-full"
                disabled
                size="icon-sm"
                type="button"
              >
                <Loader2Icon className="size-3.5 animate-spin" />
              </Button>
            </IconTooltip>
          ) : (
            <IconTooltip label="Send" side="top">
              <Button
                aria-label="Send message"
                className={cn(
                  "size-8 cursor-pointer rounded-full shadow-none disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-100",
                  MODE_SEND_CLASS[mode],
                )}
                disabled={!canSubmit}
                size="icon-sm"
                type="submit"
              >
                <ArrowUpIcon className="size-4" />
              </Button>
            </IconTooltip>
          )}
        </div>
      </div>
    </form>
  );

  if (!disabledReason || (!disabled && !isBusy && !isPreparing)) {
    return form;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="min-w-0">{form}</div>
      </TooltipTrigger>
      <TooltipContent id={disabledReasonId} side="top">
        {disabledReason}
      </TooltipContent>
    </Tooltip>
  );
}
