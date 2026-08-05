"use client";

import { ArrowUpIcon, Loader2Icon, PaperclipIcon, SquareIcon, XIcon } from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { canSubmitChatTurn, type PendingAttachment } from "@/lib/chat/attachments";
import { getChatMessageLength, MAX_CHAT_MESSAGE_CHARS } from "@/lib/chat/limits";
import { cn } from "@/lib/utils";

const EMPTY_ATTACHMENTS: readonly PendingAttachment[] = [];

function formatAttachmentSize(size: number): string {
  if (size < 1_024) {
    return `${size} B`;
  }
  if (size < 1_048_576) {
    return `${(size / 1_024).toFixed(1)} KB`;
  }
  return `${(size / 1_048_576).toFixed(1)} MB`;
}

export function ChatComposer({
  attachments = EMPTY_ATTACHMENTS,
  autoFocus = true,
  className,
  disabled = false,
  disabledReason,
  footerStart,
  isBusy = false,
  isPreparing = false,
  maxLength = MAX_CHAT_MESSAGE_CHARS,
  onAddFiles,
  onChange,
  onRemoveAttachment,
  onStop,
  onSubmit,
  placeholder = "Ask Brain anything...",
  value,
}: {
  readonly attachments?: readonly PendingAttachment[];
  readonly autoFocus?: boolean;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
  readonly footerStart?: ReactNode;
  readonly isBusy?: boolean;
  readonly isPreparing?: boolean;
  readonly maxLength?: number;
  readonly onAddFiles?: (files: readonly File[]) => void;
  readonly onChange: (value: string) => void;
  readonly onRemoveAttachment?: (id: string) => void;
  readonly onStop: () => void;
  readonly onSubmit: (value: string) => void | Promise<void>;
  readonly placeholder?: string;
  readonly value: string;
}) {
  const composerId = useId();
  const disabledReasonId = useId();
  const fileInputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaDisabled = disabled || isBusy || isPreparing;
  const shouldFocusOnMountRef = useRef(autoFocus && !textareaDisabled);
  const trimmedValue = value.trim();
  const isOverMaxLength = getChatMessageLength(trimmedValue) > maxLength;
  const canSubmit =
    canSubmitChatTurn(value, attachments) &&
    !disabled &&
    !isBusy &&
    !isPreparing &&
    !isOverMaxLength;

  useEffect(() => {
    if (!shouldFocusOnMountRef.current || document.activeElement !== document.body) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    // Collapse first so scrollHeight reflects the current value, then grow until max-h.
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  const submitValue = useCallback(() => {
    if (!canSubmitChatTurn(value, attachments) || disabled || isBusy || isPreparing) {
      return;
    }
    if (getChatMessageLength(value.trim()) > maxLength) {
      return;
    }
    void onSubmit(value);
  }, [attachments, disabled, isBusy, isPreparing, maxLength, onSubmit, value]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitValue();
    },
    [submitValue],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitValue();
      }
    },
    [submitValue],
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
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const files = event.clipboardData?.files;
      if (!files || files.length === 0 || !onAddFiles) {
        return;
      }
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        return;
      }
      event.preventDefault();
      onAddFiles(imageFiles);
    },
    [onAddFiles],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLTextAreaElement>) => {
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
        "border-border/80 bg-card/95 focus-within:border-border focus-within:ring-foreground/5 dark:bg-muted/45 min-w-0 rounded-[14px] border shadow-sm transition-colors focus-within:ring-[1px] dark:focus-within:ring-white/5",
        className,
      )}
      aria-describedby={disabledReason ? disabledReasonId : undefined}
      data-chat-composer
      onSubmit={handleSubmit}
    >
      {attachments.length > 0 ? (
        <ul className="flex flex-wrap gap-2 px-3 pt-3 sm:px-4">
          {attachments.map((file) => (
            <li
              className="border-border/70 bg-muted/40 flex max-w-full items-center gap-2 rounded-lg border px-2 py-1.5"
              key={file.id}
            >
              {file.mediaType.startsWith("image/") ? (
                <Image
                  alt=""
                  className="size-8 shrink-0 rounded object-cover"
                  height={32}
                  src={file.dataUrl}
                  unoptimized
                  width={32}
                />
              ) : (
                <span className="bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded text-[10px] font-medium">
                  FILE
                </span>
              )}
              <span className="min-w-0">
                <span className="text-foreground block max-w-[10rem] truncate text-xs font-medium">
                  {file.filename}
                </span>
                <span className="text-muted-foreground block text-[11px]">
                  {formatAttachmentSize(file.size)}
                </span>
              </span>
              {onRemoveAttachment ? (
                <button
                  aria-label={`Remove ${file.filename}`}
                  className="text-muted-foreground hover:text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-md"
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
      <textarea
        aria-describedby={disabledReason ? disabledReasonId : undefined}
        className="placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/60 max-h-56 min-h-[5.5rem] w-full resize-none overflow-y-auto bg-transparent px-3 pt-3 pb-1 text-base leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 md:text-[15px]"
        data-chat-composer-input
        disabled={textareaDisabled}
        id={composerId}
        onChange={(event) => onChange(event.target.value)}
        onDragOver={(event) => {
          if (onAddFiles && !textareaDisabled) {
            event.preventDefault();
          }
        }}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        ref={textareaRef}
        rows={3}
        value={value}
      />
      <div className="flex min-h-9 items-center justify-between gap-2 px-3 pt-1 pb-2 sm:gap-3 sm:px-4">
        <div className="-ml-2 flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {footerStart ?? <span className="block h-8" />}
          {onAddFiles ? (
            <>
              <input
                accept="image/*,.pdf,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv"
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
              <button
                aria-label="Attach file"
                className="text-muted-foreground/75 hover:bg-muted/60 hover:text-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-50"
                disabled={textareaDisabled}
                onClick={() => fileInputRef.current?.click()}
                title="Attach image, PDF, or text"
                type="button"
              >
                <PaperclipIcon className="size-4" />
              </button>
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center">
          {isBusy ? (
            <Button
              aria-label={disabledReason === "Stopping…" ? "Stopping response" : "Stop response"}
              className="bg-foreground/15 text-foreground hover:bg-foreground/25 size-6 cursor-pointer rounded-md shadow-none"
              onClick={onStop}
              size="icon-xs"
              type="button"
            >
              <SquareIcon className="size-2.5 fill-current" />
            </Button>
          ) : isPreparing ? (
            <Button
              aria-label="Preparing chat"
              className="bg-foreground/75 text-background size-6 rounded-md"
              disabled
              size="icon-xs"
              type="button"
            >
              <Loader2Icon className="size-3 animate-spin" />
            </Button>
          ) : (
            <Button
              aria-label="Send message"
              className="bg-foreground text-background hover:bg-foreground/90 size-6 cursor-pointer rounded-md disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-30"
              disabled={!canSubmit}
              size="icon-xs"
              type="submit"
            >
              <ArrowUpIcon className="size-3.5" />
            </Button>
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
