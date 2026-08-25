import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";
import { asOptionalJson } from "../lib/params.ts";

interface Input {
  messageHandle: string;
  layout?: unknown;
  url?: string;
  fallbackText?: string;
  interactive?: boolean;
  sendStyle?: string;
  idempotencyKey?: string;
}

/**
 * `POST /api/messages/{message_handle}/update-app-card` — continues an
 * existing App Card by sending a NEW Apple message in the same iMessage
 * session (its own message handle, its own delivery/read status), rather than
 * mutating the original message in place.
 */
const messageAppCardUpdate: ActionDefinition<Input> = {
  key: "message-app-card-update",
  type: "perform",
  resource: "message",
  title: "Update App Card",
  description: "Continue an existing App Card session with a new Apple message.",
  idempotent: false,
  params: [
    { key: "messageHandle", label: "Message handle", type: "string", required: true },
    {
      key: "layout",
      label: "Layout (JSON)",
      type: "json",
      hint: '{ "caption": "...", "imageUrl": "https://...", ... } — mirrors ' +
        "MSMessageTemplateLayout.",
    },
    { key: "url", label: "URL delivered on tap", type: "string" },
    { key: "fallbackText", label: "Fallback text", type: "string" },
    { key: "interactive", label: "Use live layout (interactive)", type: "boolean" },
    {
      key: "sendStyle",
      label: "Expressive send style",
      type: "select",
      options: [
        "celebration",
        "shooting_star",
        "fireworks",
        "lasers",
        "love",
        "confetti",
        "balloons",
        "spotlight",
        "echo",
        "invisible",
        "gentle",
        "loud",
        "slam",
      ].map((v) => ({ value: v, label: v })),
      advanced: true,
    },
    {
      key: "idempotencyKey",
      label: "Idempotency key",
      type: "string",
      advanced: true,
      hint: "Reusing this key for the same App Card target returns the original update instead " +
        "of sending again.",
    },
  ],
  output: [
    { key: "message_handle", type: "string", label: "New message handle" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post(
      `/api/messages/${encodeURIComponent(input.messageHandle)}/update-app-card`,
      compact({
        layout: asOptionalJson(input.layout, "layout"),
        url: input.url,
        fallback_text: input.fallbackText,
        interactive: input.interactive,
        send_style: input.sendStyle,
        idempotency_key: input.idempotencyKey,
      }),
    );
  },
};

export default messageAppCardUpdate;
