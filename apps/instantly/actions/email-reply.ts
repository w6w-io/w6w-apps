import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient, toList } from "../lib/client.ts";

/**
 * `POST /api/v2/emails/reply` — send a reply from the Unibox.
 *
 * The field is `reply_to_uuid` — the vendor's own prose description on the
 * `developer.instantly.ai` page for this route spells it "reyply_to_uuid"
 * (a typo in that page's copy), but the actual OpenAPI schema property, and
 * the one the API accepts, is `reply_to_uuid`. Only the schema was trusted
 * here.
 *
 * Not idempotent: every call sends a new email, and Instantly gives this
 * route no idempotency key to de-duplicate a retried request.
 */
interface Input {
  eaccount: string;
  reply_to_uuid: string;
  subject: string;
  html?: string;
  text?: string;
  additional_recipients?: string[] | string;
  cc_address_email_list?: string[] | string;
  bcc_address_email_list?: string[] | string;
}

const emailReply: ActionDefinition<Input> = {
  key: "email-reply",
  type: "perform",
  resource: "email",
  title: "Reply to Email",
  description: "Send a reply to an existing email from the Unibox.",
  idempotent: false,
  params: [
    {
      key: "eaccount",
      label: "Sending account",
      type: "string",
      required: true,
      hint: "Must be an account already connected to this workspace.",
    },
    {
      key: "reply_to_uuid",
      label: "Email to reply to",
      type: "string",
      required: true,
      hint: "The `id` field of the email being replied to (from a List/Get Email result).",
    },
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "html",
      label: "Body (HTML)",
      type: "text",
      hint: "Use <br/> for line breaks. Provide this, Text, or both.",
    },
    { key: "text", label: "Body (text)", type: "text" },
    {
      key: "additional_recipients",
      label: "Additional recipients",
      type: "array",
      item: { type: "string", placeholder: "jondoe@example.com" },
    },
    { key: "cc_address_email_list", label: "CC", type: "array", item: { type: "string" } },
    { key: "bcc_address_email_list", label: "BCC", type: "array", item: { type: "string" } },
  ],
  output: [
    { key: "id", type: "string", label: "Sent email ID" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json("/emails/reply", {
      method: "POST",
      body: {
        eaccount: input.eaccount,
        reply_to_uuid: input.reply_to_uuid,
        subject: input.subject,
        body: { html: input.html, text: input.text },
        additional_recipients: toList(input.additional_recipients),
        cc_address_email_list: toList(input.cc_address_email_list),
        bcc_address_email_list: toList(input.bcc_address_email_list),
      },
    });
  },
};

export default emailReply;
