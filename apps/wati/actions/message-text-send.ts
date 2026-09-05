import type { ActionDefinition } from "@w6w/types";
import { WatiClient } from "../lib/client.ts";
import { CONVERSATION_TARGET_PARAM } from "../lib/params.ts";

interface Input {
  target: string;
  text: string;
  isBot?: boolean;
}

interface MessageDto {
  id?: string;
  text?: string;
  status?: string;
  local_message_id?: string;
  conversation_id?: string;
}

interface SendTextResponse {
  message?: MessageDto;
}

/**
 * `POST /api/ext/v3/conversations/messages/text` — verified against the embedded OpenAPI
 * document 2026-09-05. Requires an ACTIVE conversation (within WhatsApp's 24-hour session
 * window) — use `template-messages-send` to open one instead.
 *
 * The operation's own description states: "Status code 200 means the message was accepted by
 * WATI, not delivered yet" — delivery/failure only arrives later via webhook, which this app
 * does not implement (no `triggers` are declared; see README).
 *
 * Not marked idempotent: retrying sends a second, duplicate message.
 */
const action: ActionDefinition<Input, SendTextResponse> = {
  key: "message-text-send",
  type: "perform",
  resource: "conversations",
  title: "Send Session Text Message",
  description: "Send a free-form text message into an active (within 24h) conversation.",
  idempotent: false,
  params: [
    { ...CONVERSATION_TARGET_PARAM },
    { key: "text", label: "Message Text", type: "text", required: true },
    {
      key: "isBot",
      label: "Send As Bot",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "Instagram conversations only: false uses the human-agent reply window/tag instead " +
        "of the bot window. Ignored for WhatsApp conversations.",
    },
  ],
  output: [
    { key: "message", label: "Sent Message", type: "object" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "sending Wati session text message", { target: input.target });
    return await new WatiClient(ctx).post<SendTextResponse>("/conversations/messages/text", {
      target: input.target,
      text: input.text,
      is_bot: input.isBot,
    });
  },
};

export default action;
