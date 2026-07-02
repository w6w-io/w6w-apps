import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  content?: string;
  tts?: boolean;
  /** Reply to a message in the same channel. */
  replyToMessageId?: string;
  /** Free-form `embeds` array — Discord accepts up to 10, per the docs. */
  embeds?: Array<Record<string, unknown>>;
  /** Message flags (see Discord docs) — e.g. 4096 = SUPPRESS_NOTIFICATIONS, 4 = SUPPRESS_EMBEDS. */
  flags?: number;
}

/**
 * Send a message to a channel, thread, or DM channel.
 *
 * The n8n node exposes a rich "sendTo" selector (channel/user/thread) with
 * name-search and DM-channel bootstrapping. Here we accept a resolved
 * `channelId` — callers are expected to do the resolution (or use OAuth
 * `users.getOrCreateDMChannel` from a separate action if we add one later).
 *
 * https://discord.com/developers/docs/resources/channel#create-message
 */
const sendMessage: ActionDefinition<Input> = {
  key: "send-message",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send a message to a channel.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "content", label: "Content", type: "text" },
    { key: "tts", label: "Text-to-Speech (TTS)", type: "boolean" },
    { key: "replyToMessageId", label: "Reply to Message ID", type: "string" },
    { key: "embeds", label: "Embeds", type: "json", hint: "Array of embed objects (up to 10)." },
    { key: "flags", label: "Flags", type: "number" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.content !== undefined) body.content = input.content;
    if (input.tts !== undefined) body.tts = input.tts;
    if (input.embeds !== undefined) body.embeds = input.embeds;
    if (input.flags !== undefined) body.flags = input.flags;
    if (input.replyToMessageId) {
      body.message_reference = { message_id: input.replyToMessageId };
    }
    const client = new DiscordClient(ctx);
    return client.request(`/channels/${input.channelId}/messages`, {
      method: "POST",
      body,
    });
  },
};

export default sendMessage;
