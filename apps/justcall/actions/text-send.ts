import type { ActionDefinition } from "@w6w/types";
import { compact, JustCallClient } from "../lib/client.ts";

/**
 * `POST /v2.1/texts/new` — verified against `texts_new_v21`'s OpenAPI fragment,
 * 2026-09-05.
 *
 * `contact_number` and `justcall_number` must be **E.164** (`+` and country
 * code) per the vendor's own field descriptions — unlike the numeric,
 * country-code-optional `contact_number` in `call-list`'s filters. `media_url`
 * is a single string of **comma-separated** URLs (max 10, 5 MB cumulative, from
 * a fixed MIME allowlist), not a JSON array.
 */
interface Input {
  justcall_number: string;
  contact_number: string;
  body: string;
  media_url?: string;
  restrict_once?: string;
  schedule_at?: string;
}

const textSend: ActionDefinition<Input> = {
  key: "text-send",
  type: "perform",
  resource: "text",
  title: "Send SMS/MMS",
  description:
    "Send an SMS (or MMS, with media_url) from a JustCall number to a contact. Maximum 1,600 " +
    "characters.",
  // No idempotency key of any kind is documented — a retry sends a second
  // message.
  idempotent: false,
  params: [
    {
      key: "justcall_number",
      label: "From (JustCall number)",
      type: "string",
      required: true,
      hint: "E.164 format, e.g. +14155551234.",
    },
    {
      key: "contact_number",
      label: "To (contact number)",
      type: "string",
      required: true,
      hint: "E.164 format, e.g. +14155555678.",
    },
    {
      key: "body",
      label: "Message",
      type: "text",
      required: true,
      validation: { maxLength: 1600 },
    },
    {
      key: "media_url",
      label: "Media URLs",
      type: "string",
      hint: "Comma-separated public URLs, max 10, 5 MB total, from the vendor's MIME allowlist.",
    },
    {
      key: "restrict_once",
      label: "Restrict to once per 24h",
      type: "select",
      options: [{ label: "No (default)", value: "No" }, { label: "Yes", value: "Yes" }],
    },
    {
      key: "schedule_at",
      label: "Schedule at",
      type: "string",
      hint: "YYYY-MM-DD HH:mm:ss. Leave blank to send immediately.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "SMS ID" },
    { key: "direction", type: "string", label: "Outbound" },
    { key: "delivery_status", type: "string", label: "Delivery status" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.data("/texts/new", {
      method: "POST",
      body: compact({
        justcall_number: input.justcall_number,
        contact_number: input.contact_number,
        body: input.body,
        media_url: input.media_url,
        restrict_once: input.restrict_once,
        schedule_at: input.schedule_at,
      }),
    });
  },
};

export default textSend;
