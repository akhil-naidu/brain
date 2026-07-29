"use client";

import { useEveAgent } from "eve/react";
import { useCallback, useState } from "react";
import {
  ChatConversation,
  ChatConversationContent,
  ChatScrollButton,
} from "@/components/chat/conversation";
import { ChatComposer } from "@/components/chat/composer";
import {
  AgentMessage,
  type AgentInputResponse,
} from "@/components/chat/message";

export function EphemeralAgentChat() {
  const agent = useEveAgent();
  const [value, setValue] = useState("");
  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const messages = agent.data.messages;
  const lastMessage = messages.at(-1);

  const handleInputResponses = useCallback(
    async (responses: readonly AgentInputResponse[]) => {
      await agent.send({ inputResponses: [...responses] });
    },
    [agent],
  );

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <ChatConversation className="min-h-0 flex-1">
        <ChatConversationContent className="mx-auto w-full max-w-3xl gap-4 px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-24">
              <div className="text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Brain</h1>
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
            isBusy={isBusy}
            onChange={setValue}
            onStop={() => agent.stop()}
            onSubmit={async (text) => {
              setValue("");
              await agent.send({ message: text });
            }}
            placeholder="Ask Brain anything..."
            value={value}
          />
        </div>
      </div>
    </div>
  );
}
