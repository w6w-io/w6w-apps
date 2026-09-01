import type { ActionDefinition } from "@w6w/types";
import { MessageBirdClient } from "../lib/client.ts";
import { toMsisdn } from "../lib/params.ts";

interface Input {
  recipients: string[];
  originator: string;
  message: string;
  type?: "sms" | "binary" | "flash";
  reference?: string;
  reportUrl?: string;
  validity?: number;
  datacoding?: "plain" | "unicode" | "auto";
  scheduledDatetime?: string;
}

/**
 * Send an SMS via MessageBird's `Messages` resource: `POST /messages`.
 * Verified against developers.messagebird.com/api/sms-messaging/#send-sms.
 *
 * `recipients` is documented as an array of msisdns; MessageBird's own curl
 * example only shows a single form-encoded value, but this app sends a JSON
 * body (per the API reference's "Requests" section), where the field's
 * documented type of `array` applies directly.
 */
const sendSms: ActionDefinition<Input> = {
  key: "send-sms",
  type: "perform",
  resource: "sms",
  title: "Send SMS",
  description: "Send an SMS message to one or more recipients.",
  idempotent: false,
  params: [
    {
      key: "recipients",
      label: "Recipients",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "+31612345678" },
      hint: "Phone numbers in E.164 format.",
    },
    {
      key: "originator",
      label: "Originator",
      type: "string",
      required: true,
      hint:
        "Sender phone number (with country code) or an alphanumeric string up to 11 characters.",
    },
    { key: "message", label: "Message", type: "text", required: true },
    {
      key: "options",
      label: "Additional options",
      type: "section",
      section: "collapsible",
      title: "Additional options",
      subtitle: "Type, scheduling, reference, status callback",
      collapsed: true,
      children: [
        {
          key: "type",
          label: "Message type",
          type: "select",
          default: "sms",
          options: [
            { value: "sms", label: "SMS" },
            { value: "binary", label: "Binary" },
            { value: "flash", label: "Flash" },
          ],
        },
        {
          key: "datacoding",
          label: "Data coding",
          type: "select",
          default: "plain",
          options: [
            { value: "plain", label: "Plain (GSM 03.38)" },
            { value: "unicode", label: "Unicode" },
            { value: "auto", label: "Auto" },
          ],
          hint: "Unicode limits messages to 70 characters instead of 160 before splitting.",
        },
        {
          key: "reference",
          label: "Client reference",
          type: "string",
          hint: "Required for a status report callback to be sent to reportUrl.",
        },
        {
          key: "reportUrl",
          label: "Status report URL",
          type: "string",
          hint: "Overrides the account's default status report URL for this message.",
        },
        {
          key: "validity",
          label: "Validity (seconds)",
          type: "number",
          hint: "Discard the message if not delivered within this many seconds.",
        },
        {
          key: "scheduledDatetime",
          label: "Scheduled at",
          type: "datetime",
          hint: "Schedule delivery instead of sending immediately.",
        },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "href", type: "string", label: "Message URL" },
    { key: "recipients", type: "object", label: "Recipients" },
  ],

  execute(input, ctx) {
    const client = new MessageBirdClient(ctx);
    return client.request(`/messages`, {
      method: "POST",
      body: {
        recipients: input.recipients.map(toMsisdn),
        originator: input.originator,
        body: input.message,
        type: input.type,
        reference: input.reference,
        reportUrl: input.reportUrl,
        validity: input.validity,
        datacoding: input.datacoding,
        scheduledDatetime: input.scheduledDatetime,
      },
    });
  },
};

export default sendSms;
