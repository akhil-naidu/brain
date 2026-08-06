import { z } from "zod";
import type { HandleMessageStreamEvent, SessionState } from "eve/client";

export const sessionStateSchema = z.object({
  continuationToken: z.string().optional(),
  sessionId: z.string().optional(),
  streamIndex: z.number(),
});

const streamEventSchema = z
  .object({
    type: z.string(),
  })
  .passthrough();

function isSessionState(value: unknown): value is SessionState {
  return sessionStateSchema.safeParse(value).success;
}

function isStreamEvent(value: unknown): value is HandleMessageStreamEvent {
  return streamEventSchema.safeParse(value).success;
}

export function parseSessionState(value: unknown): SessionState {
  if (!isSessionState(value)) {
    throw new Error("Invalid session state");
  }
  return value;
}

export function parseStreamEvent(value: unknown): HandleMessageStreamEvent {
  if (!isStreamEvent(value)) {
    throw new Error("Invalid stream event");
  }
  return value;
}

export function parseSessionStateJson(raw: string): SessionState {
  const parsed: unknown = JSON.parse(raw);
  return parseSessionState(parsed);
}

export function parseStreamEventJson(raw: string): HandleMessageStreamEvent {
  const parsed: unknown = JSON.parse(raw);
  return parseStreamEvent(parsed);
}

export const chatVisibilitySchema = z.enum(["personal", "shared"]);

export const createChatBodySchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  visibility: chatVisibilitySchema.optional(),
});

export const turnLockActionSchema = z.enum(["acquire", "release", "heartbeat"]);

export const updateChatBodySchema = z.object({
  title: z.string().optional(),
  visibility: chatVisibilitySchema.optional(),
  eveSession: sessionStateSchema.nullable().optional(),
  appendEvents: z.array(streamEventSchema).optional(),
  events: z.array(streamEventSchema).optional(),
  expectedRevision: z.number().int().nonnegative().optional(),
  turnLock: turnLockActionSchema.optional(),
});
