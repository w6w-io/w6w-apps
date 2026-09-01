import type { ActionDefinition } from "@w6w/types";
import { CrispClient } from "../lib/client.ts";

interface Input {
  sessionId: string;
  type: "text" | "note";
  from: "user" | "operator";
  origin: "chat" | "email";
  content: string;
}

export interface CrispSentMessage {
  fingerprint?: number;
}

/**
 * `POST /v1/website/{website_id}/conversation/{session_id}/message` — sends
 * a message into an existing conversation.
 *
 * Crisp's `content` field is polymorphic by `type` (string for `text`/`note`,
 * an object for `file`/`animation`/`audio`/`picker`/`field`/`carousel`/
 * `event` — each with its own nested shape). This action implements only
 * `text` and `note`, the two whose `content` is a plain string and which
 * cover the "send a chat reply" / "leave an internal note" cases a workflow
 * actually needs; the structured message types are left out — see README.
 */
const sendMessage: ActionDefinition<Input, CrispSentMessage | undefined> = {
  key: "send-message",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Sends a text message or an internal note into an existing conversation.",
  idempotent: false,
  params: [
    { key: "sessionId", label: "Session ID", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "text",
      options: [
        { value: "text", label: "Text (visible to the visitor)" },
        { value: "note", label: "Note (internal, operator-only)" },
      ],
    },
    {
      key: "from",
      label: "From",
      type: "select",
      required: true,
      default: "operator",
      options: [
        { value: "operator", label: "Operator" },
        { value: "user", label: "User (visitor)" },
      ],
    },
    {
      key: "origin",
      label: "Origin",
      type: "select",
      required: true,
      default: "chat",
      options: [
        { value: "chat", label: "Chat" },
        { value: "email", label: "Email" },
      ],
      hint:
        "Crisp also accepts custom `urn:*` origins for channel integrations — not exposed here.",
    },
    { key: "content", label: "Content", type: "text", required: true },
  ],
  output: [{ key: "fingerprint", type: "number", label: "Message fingerprint" }],

  execute(input, ctx) {
    const client = new CrispClient(ctx);
    return client.request<CrispSentMessage>(
      `/conversation/${encodeURIComponent(input.sessionId)}/message`,
      {
        method: "POST",
        body: {
          type: input.type,
          from: input.from,
          origin: input.origin,
          content: input.content,
        },
      },
    );
  },
};

export default sendMessage;
