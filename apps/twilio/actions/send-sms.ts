import type { ActionDefinition } from "@w6w/types";
import { TwilioClient } from "../lib/client.ts";

interface Input {
  from: string;
  to: string;
  message: string;
  toWhatsapp?: boolean;
  statusCallback?: string;
}

/**
 * Send an SMS/MMS/WhatsApp message via Twilio's `Messages` REST resource.
 * When `toWhatsapp` is true, both `From` and `To` are prefixed with `whatsapp:`
 * so Twilio routes the payload through WhatsApp instead of SMS.
 */
const sendSms: ActionDefinition<Input> = {
  key: "send-sms",
  type: "perform",
  resource: "sms",
  title: "Send SMS",
  description: "Send an SMS, MMS, or WhatsApp message.",
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      hint: "Sender phone number in E.164 format, e.g. +14155238886.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "Recipient phone number in E.164 format.",
    },
    { key: "message", label: "Message", type: "text", required: true },
    {
      key: "toWhatsapp",
      label: "Send to WhatsApp",
      type: "boolean",
      default: false,
      hint: "Prefix both numbers with `whatsapp:` to route via WhatsApp.",
    },
    {
      key: "statusCallback",
      label: "Status Callback URL",
      type: "string",
      hint: "URL Twilio will POST message status updates to.",
    },
  ],

  async execute(input, ctx) {
    const client = new TwilioClient(ctx);
    const from = input.toWhatsapp ? `whatsapp:${input.from}` : input.from;
    const to = input.toWhatsapp ? `whatsapp:${input.to}` : input.to;
    return client.request(client.accountPath("/Messages.json"), {
      method: "POST",
      form: {
        From: from,
        To: to,
        Body: input.message,
        StatusCallback: input.statusCallback,
      },
    });
  },
};

export default sendSms;
