import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient, compact, partialFailures } from "../lib/client.ts";

interface Input {
  to?: string;
  listId?: number;
  body: string;
  from?: string;
  schedule?: number;
  customString?: string;
  country?: string;
  fromEmail?: string;
  source?: string;
}

interface SmsMessageResult {
  direction?: string;
  date?: number;
  to?: string;
  body?: string;
  from?: string;
  schedule?: number;
  message_id?: string;
  message_parts?: number;
  message_price?: number;
  custom_string?: string;
  country?: string;
  carrier?: string;
  status?: string;
}

interface SendSmsResponse {
  total_price?: number;
  total_count?: number;
  queued_count?: number;
  messages?: SmsMessageResult[];
  currency?: Record<string, unknown>;
}

/**
 * `POST /sms/send` — send one SMS.
 *
 * ClickSend's endpoint takes a `messages` array (up to 1000 per call, mixing
 * individual numbers and contact lists); this Action always sends exactly one
 * entry, wrapped for the wire. Recipients accept **either** `to` **or** `listId`
 * (a whole Contact List) — never both; `listId` fans one Action call out to every
 * contact on the list, so the response `messages` array can contain more than one
 * result even though the request had one.
 *
 * A standard (GSM) SMS is 160 characters; anything longer is split into 153-char
 * parts and billed per part (see README "Message parts & pricing"). `messageParts`
 * in the output reports how many parts ClickSend actually billed.
 *
 * A batch call answers HTTP 200 as long as the request itself was well-formed —
 * an individual bad recipient (`INVALID_RECIPIENT`, `INSUFFICIENT_CREDIT`, …)
 * shows up as that message's own `status`, not as an HTTP error. This Action logs
 * (but does not throw on) any non-`SUCCESS` status, since sending to a list means
 * a partial failure is a normal outcome, not a broken call — inspect `messages`.
 */
const sendSms: ActionDefinition<Input> = {
  key: "send-sms",
  type: "perform",
  idempotent: false,
  resource: "sms",
  title: "Send SMS",
  description: "Send a single SMS message via ClickSend (POST /sms/send).",
  params: [
    {
      key: "to",
      label: "To",
      type: "string",
      hint: "Recipient number in E.164 format, e.g. +61411111111. Use this OR List ID, not both.",
    },
    {
      key: "listId",
      label: "List ID",
      type: "number",
      hint: "Send to every contact in this Contact List instead of a single number.",
    },
    { key: "body", label: "Message", type: "text", required: true },
    {
      key: "from",
      label: "From (Sender ID)",
      type: "string",
      hint: "A ClickSend number, alphanumeric sender ID (max 11 chars, no spaces), or blank " +
        "to use your account default.",
    },
    {
      key: "schedule",
      label: "Schedule (Unix timestamp)",
      type: "number",
      hint: "Leave blank to send immediately.",
    },
    {
      key: "customString",
      label: "Custom reference",
      type: "string",
      hint: "Echoed back on delivery receipts and replies.",
    },
    { key: "country", label: "Recipient country", type: "string", hint: "ISO 3166 alpha-2." },
    {
      key: "fromEmail",
      label: "Reply-to email",
      type: "string",
      hint: "Where an SMS reply is emailed. Defaults to the account's own address.",
    },
    { key: "source", label: "Source label", type: "string", default: "w6w" },
  ],
  output: [
    { key: "messageId", type: "string", label: "Message ID" },
    { key: "status", type: "string", label: "Status of the first recipient" },
    { key: "to", type: "string", label: "Recipient" },
    { key: "messageParts", type: "number", label: "Billed message parts" },
    { key: "messagePrice", type: "number", label: "Price for this message" },
    { key: "totalPrice", type: "number", label: "Total price for the whole call" },
    { key: "totalCount", type: "number", label: "Total recipients" },
    { key: "queuedCount", type: "number", label: "Recipients successfully queued" },
    { key: "messages", type: "array", label: "Per-recipient results" },
    { key: "currency", type: "object", label: "Currency" },
  ],

  async execute(input, ctx) {
    if (!input.to && !input.listId) {
      throw new Error("send-sms requires either `to` or `listId`");
    }
    const message = compact({
      source: input.source ?? "w6w",
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
    const data = await client.data<SendSmsResponse>("/sms/send", {
      method: "POST",
      body: { messages: [message] },
    });

    const failures = partialFailures(data.messages);
    if (failures.length > 0) {
      ctx.log("warn", "clicksend: send-sms had per-recipient failures", { failures });
    }

    const first = data.messages?.[0];
    return {
      messageId: first?.message_id,
      status: first?.status,
      to: first?.to,
      messageParts: first?.message_parts,
      messagePrice: first?.message_price,
      totalPrice: data.total_price,
      totalCount: data.total_count,
      queuedCount: data.queued_count,
      messages: data.messages ?? [],
      currency: data.currency,
    };
  },
};

export default sendSms;
