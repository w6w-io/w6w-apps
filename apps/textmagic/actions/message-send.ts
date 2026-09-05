import type { ActionDefinition } from "@w6w/types";
import { compact, TextMagicClient } from "../lib/client.ts";

/**
 * `POST /api/v2/messages` — send a text message now, or schedule one.
 *
 * Exactly one of `text` or `templateId` is required, and exactly one of
 * `phones` / `contacts` / `lists` names a recipient. Phone numbers are E.164
 * (`447860021130` — no local formats).
 *
 * ## `sendingTime` is deprecated — this app never sends it
 *
 * The vendor's own schema marks `sendingTime` (a Unix timestamp)
 * `"deprecated": true` and says to use `sendingDateTime` + `sendingTimezone`
 * instead (`Y-m-d H:i:s`, relative to the given timezone). Only the
 * non-deprecated pair is exposed here.
 *
 * ## Three response shapes depending on recipient count
 *
 * `type` in the response distinguishes what actually happened:
 * `"message"` (single recipient), `"session"` (multiple recipients, sent
 * synchronously), `"schedule"` (deferred to `sendingDateTime`), or `"bulk"`
 * (so many recipients TextMagic processes it asynchronously — in that case the
 * response is a bare `202 Accepted` with **no body** at all, which is why
 * `output` below documents every field as optional).
 */
interface Input {
  text?: string;
  templateId?: number;
  phones?: string;
  contacts?: string;
  lists?: string;
  from?: string;
  sendingDateTime?: string;
  sendingTimezone?: string;
  rrule?: string;
  cutExtra?: boolean;
  partsCount?: number;
  referenceId?: number;
  createChat?: boolean;
}

const messageSend: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send a text message immediately, or schedule it for later.",
  idempotent: false,
  params: [
    {
      key: "text",
      label: "Text",
      type: "text",
      hint: "Required if templateId is not set.",
    },
    {
      key: "templateId",
      label: "Template ID",
      type: "number",
      hint: "Send a saved template's content instead of text. Required if text is not set.",
    },
    {
      key: "phones",
      label: "Phone numbers",
      type: "string",
      hint: "Comma-separated E.164 numbers, e.g. 447860021130,447860021131.",
    },
    { key: "contacts", label: "Contact IDs", type: "string", hint: "Comma-separated." },
    { key: "lists", label: "List IDs", type: "string", hint: "Comma-separated." },
    {
      key: "from",
      label: "Sender ID",
      type: "string",
      hint: "An allowed phone number or alphanumeric Sender ID. Falls back to the account " +
        "default if this one is not permitted for a destination.",
    },
    {
      key: "sendingDateTime",
      label: "Sending date/time",
      type: "string",
      hint: "Y-m-d H:i:s, relative to sendingTimezone. Leave empty to send now.",
    },
    {
      key: "sendingTimezone",
      label: "Sending timezone",
      type: "string",
      hint: "IANA or TextMagic timezone name. Default is the account timezone.",
    },
    {
      key: "rrule",
      label: "Recurrence (iCal RRULE)",
      type: "string",
      hint: "Requires sendingDateTime as the start point.",
    },
    {
      key: "cutExtra",
      label: "Cut extra characters",
      type: "boolean",
      default: false,
      hint: "If false, exceeding partsCount returns 400 instead of truncating.",
    },
    { key: "partsCount", label: "Max message parts", type: "number", default: 6 },
    { key: "referenceId", label: "Reference ID", type: "number", hint: "Your own correlation id." },
    { key: "createChat", label: "Create chat if missing", type: "boolean", default: false },
  ],
  output: [
    { key: "id", type: "number", label: "Message, session or schedule ID" },
    { key: "href", type: "string", label: "URI of the created resource" },
    { key: "type", type: "string", label: "message | session | schedule | bulk" },
    { key: "sessionId", type: "number", label: "Session ID, when applicable" },
    { key: "bulkId", type: "string", label: "Bulk session ID, when type is bulk" },
    { key: "messageId", type: "number", label: "Message ID, when applicable" },
    { key: "scheduleId", type: "number", label: "Schedule ID, when applicable" },
    { key: "chatId", type: "number", label: "Chat ID, when applicable" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json("/messages", {
      method: "POST",
      body: compact({ ...input }),
    });
  },
};

export default messageSend;
