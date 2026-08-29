import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";

/**
 * `POST /api/v2/emails/forward` — forward an existing email.
 *
 * `include_original_body` defaults to leaving the original body OUT; set it
 * to append the original message under the note you provide.
 */
interface Input {
  eaccount: string;
  reply_to_uuid: string;
  to_address_email_list: string;
  subject: string;
  html?: string;
  text?: string;
  include_original_body?: boolean;
  cc_address_email_list?: string;
  bcc_address_email_list?: string;
}

const emailForward: ActionDefinition<Input> = {
  key: "email-forward",
  type: "perform",
  resource: "email",
  title: "Forward Email",
  description: "Forward an existing email to another recipient.",
  idempotent: false,
  params: [
    { key: "eaccount", label: "Sending account", type: "string", required: true },
    {
      key: "reply_to_uuid",
      label: "Email to forward",
      type: "string",
      required: true,
      hint: "The `id` field of the email being forwarded.",
    },
    {
      key: "to_address_email_list",
      label: "To",
      type: "string",
      required: true,
      hint: "Comma-separated recipients.",
    },
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "html", label: "Note (HTML)", type: "text" },
    { key: "text", label: "Note (text)", type: "text" },
    {
      key: "include_original_body",
      label: "Append the original message",
      type: "boolean",
      hint: "Off by default: only your note is sent unless this is turned on.",
    },
    { key: "cc_address_email_list", label: "CC", type: "string" },
    { key: "bcc_address_email_list", label: "BCC", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Sent email ID" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json("/emails/forward", {
      method: "POST",
      body: {
        eaccount: input.eaccount,
        reply_to_uuid: input.reply_to_uuid,
        to_address_email_list: input.to_address_email_list,
        subject: input.subject,
        body: { html: input.html, text: input.text },
        include_original_body: input.include_original_body,
        cc_address_email_list: input.cc_address_email_list,
        bcc_address_email_list: input.bcc_address_email_list,
      },
    });
  },
};

export default emailForward;
