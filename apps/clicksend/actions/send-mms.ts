import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient, compact, partialFailures } from "../lib/client.ts";

interface Input {
  mediaFile: string;
  to?: string;
  listId?: number;
  subject: string;
  body: string;
  from?: string;
  schedule?: number;
  customString?: string;
  country?: string;
  fromEmail?: string;
  source?: string;
}

interface MmsMessageResult {
  list_id?: number;
  contact_id?: number;
  message_id?: string;
  to?: string;
  subject?: string;
  from?: string;
  body?: string;
  country?: string;
  custom_string?: string;
  schedule?: string;
  message_parts?: number;
  message_price?: string;
  _media_file_url?: string;
  status?: string;
}

interface SendMmsResponse {
  total_price?: number;
  total_count?: number;
  queued_count?: number;
  messages?: MmsMessageResult[];
  _currency?: Record<string, unknown>;
}

/**
 * `POST /mms/send` — send one MMS.
 *
 * `mediaFile` sits at the **top level** of the request body, not per-message —
 * ClickSend's own blueprint attribute list documents it alongside per-message
 * fields (`to`, `subject`, `body`), but the one worked request example in the
 * same doc shows a single `media_file` key outside the `messages` array, applied
 * to every message the call sends. This Action sends exactly one message per
 * call, which sidesteps the ambiguity of what a *second* message's media file
 * would even mean.
 *
 * `mediaFile` must be a URL ClickSend can fetch (jpg/gif work directly; png/bmp/
 * jpeg must be converted first via `POST /uploads?convert=mms`, not implemented
 * by this app — see README). Max 250 kB. `subject` is capped at 20 characters —
 * ClickSend truncates rather than rejects a longer one.
 */
const sendMms: ActionDefinition<Input> = {
  key: "send-mms",
  type: "perform",
  idempotent: false,
  resource: "mms",
  title: "Send MMS",
  description: "Send a single MMS message via ClickSend (POST /mms/send).",
  params: [
    {
      key: "mediaFile",
      label: "Media file URL",
      type: "string",
      required: true,
      hint: "A URL ClickSend can fetch. jpg/gif only — png/bmp/jpeg need /uploads?convert=mms " +
        "first (not covered by this app).",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      hint: "Recipient number in E.164 format. Use this OR List ID, not both.",
    },
    { key: "listId", label: "List ID", type: "number" },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      required: true,
      hint: "Max 20 characters — ClickSend truncates longer values.",
    },
    { key: "body", label: "Message", type: "text", required: true },
    { key: "from", label: "From", type: "string", hint: "A ClickSend number, or blank." },
    { key: "schedule", label: "Schedule (Unix timestamp)", type: "number" },
    { key: "customString", label: "Custom reference", type: "string" },
    { key: "country", label: "Recipient country", type: "string", hint: "ISO 3166 alpha-2." },
    { key: "fromEmail", label: "Reply-to email", type: "string" },
    { key: "source", label: "Source label", type: "string", default: "w6w" },
  ],
  output: [
    { key: "messageId", type: "string", label: "Message ID" },
    { key: "status", type: "string", label: "Status of the first recipient" },
    { key: "to", type: "string", label: "Recipient" },
    { key: "messagePrice", type: "string", label: "Price for this message" },
    { key: "totalPrice", type: "number", label: "Total price for the whole call" },
    { key: "totalCount", type: "number", label: "Total recipients" },
    { key: "queuedCount", type: "number", label: "Recipients successfully queued" },
    { key: "messages", type: "array", label: "Per-recipient results" },
  ],

  async execute(input, ctx) {
    if (!input.to && !input.listId) {
      throw new Error("send-mms requires either `to` or `listId`");
    }
    const message = compact({
      source: input.source ?? "w6w",
      subject: input.subject,
      from: input.from,
      body: input.body,
      to: input.to,
      list_id: input.listId,
      schedule: input.schedule,
      custom_string: input.customString,
      country: input.country,
      from_email: input.fromEmail,
    });

    const client = new ClickSendClient(ctx);
    const data = await client.data<SendMmsResponse>("/mms/send", {
      method: "POST",
      body: { media_file: input.mediaFile, messages: [message] },
    });

    const failures = partialFailures(data.messages);
    if (failures.length > 0) {
      ctx.log("warn", "clicksend: send-mms had per-recipient failures", { failures });
    }

    const first = data.messages?.[0];
    return {
      messageId: first?.message_id,
      status: first?.status,
      to: first?.to,
      messagePrice: first?.message_price,
      totalPrice: data.total_price,
      totalCount: data.total_count,
      queuedCount: data.queued_count,
      messages: data.messages ?? [],
    };
  },
};

export default sendMms;
