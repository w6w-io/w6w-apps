import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient, compact, partialFailures } from "../lib/client.ts";

interface Input {
  to?: string;
  listId?: number;
  body: string;
  lang: string;
  voice: "female" | "male";
  schedule?: number;
  customString?: string;
  country?: string;
  requireInput?: boolean;
  machineDetection?: boolean;
  source?: string;
}

interface VoiceMessageResult {
  date?: number;
  to?: string;
  to_type?: string;
  body?: string;
  from?: string | null;
  lang?: string;
  voice?: string;
  schedule?: number;
  message_id?: string;
  message_parts?: number;
  message_price?: number;
  custom_string?: string;
  country?: string;
  carrier?: string;
  require_input?: number;
  machine_detection?: number;
  status?: string;
}

interface SendVoiceResponse {
  total_price?: number;
  total_count?: number;
  queued_count?: number;
  messages?: VoiceMessageResult[];
  currency?: Record<string, unknown>;
}

/**
 * `POST /voice/send` — place one text-to-speech voice call.
 *
 * `lang` and `voice` are both required by ClickSend with no server-side default
 * (`en-au` and `female` are the values every reference example uses). Use
 * `voice-languages-list` to see which `voice` (`female`/`male`, sometimes only
 * one) each `lang` code actually supports before picking a combination — an
 * unsupported pairing is rejected with `INVALID_VOICE` inside a 200 batch
 * response, not a 4xx.
 *
 * `requireInput` (keypress capture) and `machineDetection` (answering-machine
 * detection, which can leave a message instead of hanging up) both default OFF
 * on the wire; this Action only sends them when explicitly set, since ClickSend
 * bills machine detection differently from a plain call.
 */
const sendVoice: ActionDefinition<Input> = {
  key: "send-voice",
  type: "perform",
  idempotent: false,
  resource: "voice",
  title: "Send Voice Call",
  description: "Place a text-to-speech voice call via ClickSend (POST /voice/send).",
  params: [
    {
      key: "to",
      label: "To",
      type: "string",
      hint: "Recipient number in E.164 format. Use this OR List ID, not both — List ID " +
        "overrides To if both are set.",
    },
    { key: "listId", label: "List ID", type: "number" },
    { key: "body", label: "Message", type: "text", required: true },
    {
      key: "lang",
      label: "Language",
      type: "string",
      required: true,
      default: "en-au",
      hint: "See Voice Languages for the full list of codes.",
    },
    {
      key: "voice",
      label: "Voice",
      type: "select",
      required: true,
      default: "female",
      options: [{ label: "Female", value: "female" }, { label: "Male", value: "male" }],
    },
    { key: "schedule", label: "Schedule (Unix timestamp)", type: "number" },
    { key: "customString", label: "Custom reference", type: "string" },
    { key: "country", label: "Recipient country", type: "string", hint: "ISO 3166 alpha-2." },
    {
      key: "requireInput",
      label: "Require keypress",
      type: "boolean",
      hint: "Ask the recipient to press a key to confirm they heard the message.",
    },
    {
      key: "machineDetection",
      label: "Answering machine detection",
      type: "boolean",
      hint: "Detect voicemail and leave the message rather than hanging up.",
    },
    { key: "source", label: "Source label", type: "string", default: "w6w" },
  ],
  output: [
    { key: "messageId", type: "string", label: "Message ID" },
    { key: "status", type: "string", label: "Status of the first recipient" },
    { key: "to", type: "string", label: "Recipient" },
    { key: "messagePrice", type: "number", label: "Price for this call" },
    { key: "totalPrice", type: "number", label: "Total price for the whole call" },
    { key: "totalCount", type: "number", label: "Total recipients" },
    { key: "queuedCount", type: "number", label: "Recipients successfully queued" },
    { key: "messages", type: "array", label: "Per-recipient results" },
  ],

  async execute(input, ctx) {
    if (!input.to && !input.listId) {
      throw new Error("send-voice requires either `to` or `listId`");
    }
    const message = compact({
      source: input.source ?? "w6w",
      body: input.body,
      to: input.to,
      list_id: input.listId,
      lang: input.lang,
      voice: input.voice,
      schedule: input.schedule,
      custom_string: input.customString,
      country: input.country,
      require_input: input.requireInput ? 1 : undefined,
      machine_detection: input.machineDetection ? 1 : undefined,
    });

    const client = new ClickSendClient(ctx);
    const data = await client.data<SendVoiceResponse>("/voice/send", {
      method: "POST",
      body: { messages: [message] },
    });

    const failures = partialFailures(data.messages);
    if (failures.length > 0) {
      ctx.log("warn", "clicksend: send-voice had per-recipient failures", { failures });
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

export default sendVoice;
