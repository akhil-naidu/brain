"use client";

import { type EveMessageData, type UseEveAgentHelpers } from "eve/react";
import { useCallback } from "react";
import { useChatShell } from "@/app/_components/chat-shell-context";
import {
  ChatConversation,
  ChatConversationContent,
  ChatScrollButton,
} from "@/components/chat/conversation";
import { ChatComposer } from "@/components/chat/composer";
import { IntegrationsMenu } from "@/components/chat/integrations-menu";
import {
  AgentMessage,
  type AgentInputResponse,
} from "@/components/chat/message";
import { BrainMark } from "@/components/brain-mark";
import { createConnectionClientContext } from "@/lib/chat/connection-context";

export function EphemeralAgentChat({
  agent,
  draft,
  onDraftChange,
  onUserMessage,
}: {
  readonly agent: UseEveAgentHelpers<EveMessageData>;
  readonly draft: string;
  readonly onDraftChange: (value: string) => void;
  readonly onUserMessage?: (text: string) => void;
}) {
  const { enabledConnections, setConnectionEnabled } = useChatShell();
  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const messages = agent.data.messages;
  const lastMessage = messages.at(-1);

  const handleInputResponses = useCallback(
    async (responses: readonly AgentInputResponse[]) => {
      await agent.send({
        inputResponses: [...responses],
        clientContext: createConnectionClientContext(enabledConnections),
      });
    },
    [agent, enabledConnections],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
      <ChatConversation className="min-h-0 flex-1">
        <ChatConversationContent className="mx-auto w-full max-w-3xl gap-4 px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-24">
              <div className="text-center">
                <BrainMark className="mx-auto size-10 text-[2.5rem]" />
                <h1 className="mt-4 text-2xl font-semibold tracking-tight">Brain</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ask anything to get started.
                </p>
              </div>
            </div>
          ) : null}
          {messages.map((message) => (
            <AgentMessage
              canRespond={!isBusy && message.id === lastMessage?.id}
              isStreaming={
                isBusy && message.role === "assistant" && message.id === lastMessage?.id
              }
              key={message.id}
              message={message}
              onInputResponses={handleInputResponses}
            />
          ))}
          {agent.error ? (
            <p className="text-sm text-destructive">{agent.error.message}</p>
          ) : null}
        </ChatConversationContent>
        <ChatScrollButton />
      </ChatConversation>
      <div className="border-t border-border/60 bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl">
          <ChatComposer
            footerStart={
              <IntegrationsMenu
                enabledConnections={enabledConnections}
                onConnectionEnabledChange={setConnectionEnabled}
              />
            }
            isBusy={isBusy}
            onChange={onDraftChange}
            onStop={() => agent.stop()}
            onSubmit={async (text) => {
              onDraftChange("");
              onUserMessage?.(text);
              await agent.send({
                message: text,
                clientContext: createConnectionClientContext(enabledConnections),
              });
            }}
            placeholder="Ask Brain anything..."
            value={draft}
          />
        </div>
      </div>
    </div>
  );
}
