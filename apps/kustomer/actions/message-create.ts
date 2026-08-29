import type { ActionDefinition } from "@w6w/types";
import { compact, KustomerClient, unset } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  conversationId: string;
  channel: string;
  app: string;
  direction?: string;
  preview?: string;
  subject?: string;
}

const channelOptions = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "chat", label: "Chat" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter-dm", label: "Twitter DM" },
  { value: "twitter-tweet", label: "Twitter tweet" },
  { value: "voice", label: "Voice" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
];

const directionOptions = [
  { value: "in", label: "Inbound" },
  { value: "out", label: "Outbound" },
];

/**
 * `POST /v1/conversations/{id}/messages` — "Create message from conversation",
 * verified against `CreateaMessagefromConversationRequest` in the Core
 * Resources OAS. `channel` and `app` are the schema's only required fields.
 *
 * This records a message on the conversation's timeline — it does NOT
 * compose and dispatch outbound customer communication through a channel.
 * The schema carries no `body`/`htmlBody` content field (verified: absent
 * from every property `CreateaMessagefromConversationRequest` declares); the
 * fields that DO carry composed content (`body`, `htmlBody`, `to`, `from`)
 * live on Kustomer's separate, per-channel `Draft` resource
 * (`draft_email`/`draft_chat`/`draft_sms`/...), which this app leaves out —
 * its request schema is a `oneOf` discriminated by `channel` with a distinct
 * property set per branch, which is a materially different (and materially
 * larger) shape than every other action here.
 */
const messageCreate: ActionDefinition<Input> = {
  key: "message-create",
  type: "perform",
  resource: "message",
  title: "Create Message",
  description:
    "Record a message on a conversation's timeline (a log entry — not composing/sending outbound content; see the app README).",
  idempotent: false,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "string", required: true },
    { key: "channel", label: "Channel", type: "select", required: true, options: channelOptions },
    {
      key: "app",
      label: "App",
      type: "string",
      required: true,
      hint: "The integration that produced this message, e.g. `postmark`, `twilio`, `gmail`.",
    },
    { key: "direction", label: "Direction", type: "select", options: directionOptions },
    {
      key: "preview",
      label: "Preview text",
      type: "text",
      hint: "Short preview shown in the conversation list. Max 10,240 characters.",
    },
    { key: "subject", label: "Subject", type: "string" },
  ],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data(
      `/conversations/${encodeURIComponent(input.conversationId)}/messages`,
      {
        method: "POST",
        body: compact({
          channel: input.channel,
          app: input.app,
          direction: unset(input.direction),
          preview: unset(input.preview),
          subject: unset(input.subject),
        }),
      },
    );
  },
};

export default messageCreate;
