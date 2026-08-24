import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient, compact } from "../lib/client.ts";

interface EmailAddress {
  email: string;
  name?: string;
}

interface Attachment {
  content: string;
  type: string;
  filename: string;
  disposition: "inline" | "attachment";
  contentId: string;
}

interface Input {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  fromEmailAddressId: number;
  fromName?: string;
  subject: string;
  body: string;
  schedule?: number;
  attachments?: Attachment[];
}

interface SendEmailResponse {
  user_id?: number;
  subaccount_id?: number;
  from_email_address_id?: number;
  from_name?: string;
  to?: EmailAddress[];
  subject?: string;
  message_id?: string;
  status?: string;
  status_text?: string;
  soft_bounce_count?: number;
  hard_bounce_count?: number;
  price?: string;
  date_added?: number;
  custom_string?: string | null;
  _currency?: Record<string, unknown>;
}

/**
 * `POST /email/send` — send a transactional email.
 *
 * `from` is **not** a raw address: `fromEmailAddressId` is the numeric ID of a
 * sender address ClickSend has already verified for this account. Use
 * `email-address-list` to find it — the string in `data[].email_address` next to
 * a `verified: 1` row. Sending with an unverified or made-up ID fails; ClickSend
 * has no path for stamping an arbitrary `From` header the way an SMTP relay does.
 *
 * `subject` is genuinely **undocumented**: ClickSend's own API Blueprint request
 * schema (`Attributes`) lists `to`, `cc`, `bcc`, `from`, `body`, `attachments` and
 * `schedule` but omits `subject` entirely — yet the one worked request example in
 * the same document includes it, and the response always echoes it back. This
 * Action follows the worked example and requires it; a request built strictly
 * from the schema table would be missing a field the API needs.
 *
 * New accounts start in **`WaitApproval`**: ClickSend's spam-detection review
 * gate holds the first email(s) from a fresh sender address before they flip to
 * `Sent`. A `status: "WaitApproval"` on the response is not a failure — it means
 * exactly what it says, and later sends from the same verified address typically
 * skip the hold.
 */
const sendEmail: ActionDefinition<Input> = {
  key: "send-email",
  type: "perform",
  idempotent: false,
  resource: "email",
  title: "Send Transactional Email",
  description: "Send a transactional email via ClickSend (POST /email/send).",
  params: [
    {
      key: "to",
      label: "To",
      type: "array",
      required: true,
      item: {
        type: "object",
        fields: [
          { key: "email", label: "Email", type: "string", required: true },
          { key: "name", label: "Name", type: "string" },
        ],
      },
    },
    {
      key: "cc",
      label: "CC",
      type: "array",
      item: {
        type: "object",
        fields: [
          { key: "email", label: "Email", type: "string", required: true },
          { key: "name", label: "Name", type: "string" },
        ],
      },
    },
    {
      key: "bcc",
      label: "BCC",
      type: "array",
      item: {
        type: "object",
        fields: [
          { key: "email", label: "Email", type: "string", required: true },
          { key: "name", label: "Name", type: "string" },
        ],
      },
    },
    {
      key: "fromEmailAddressId",
      label: "From email address ID",
      type: "number",
      required: true,
      hint: "A verified sender's `emailAddressId` — see List Email Addresses.",
    },
    { key: "fromName", label: "From name", type: "string" },
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "body", label: "Body (HTML)", type: "text", required: true },
    { key: "schedule", label: "Schedule (Unix timestamp)", type: "number" },
    {
      key: "attachments",
      label: "Attachments",
      type: "array",
      item: {
        type: "object",
        fields: [
          { key: "content", label: "Base64 content", type: "string", required: true },
          { key: "type", label: "MIME type", type: "string", required: true },
          { key: "filename", label: "Filename", type: "string", required: true },
          {
            key: "disposition",
            label: "Disposition",
            type: "select",
            required: true,
            default: "attachment",
            options: [
              { label: "Attachment", value: "attachment" },
              { label: "Inline", value: "inline" },
            ],
          },
          { key: "contentId", label: "Content ID", type: "string", required: true },
        ],
      },
    },
  ],
  output: [
    { key: "messageId", type: "string", label: "Message ID" },
    { key: "status", type: "string", label: "Status (e.g. WaitApproval, Sent)" },
    { key: "statusText", type: "string", label: "Status detail" },
    { key: "price", type: "string", label: "Price" },
    { key: "currency", type: "object", label: "Currency" },
  ],

  async execute(input, ctx) {
    const toAddress = (a: EmailAddress) => compact({ email: a.email, name: a.name });
    const body = {
      to: input.to.map(toAddress),
      cc: input.cc?.map(toAddress),
      bcc: input.bcc?.map(toAddress),
      from: compact({ email_address_id: input.fromEmailAddressId, name: input.fromName }),
      subject: input.subject,
      body: input.body,
      schedule: input.schedule,
      attachments: input.attachments?.map((a) => ({
        content: a.content,
        type: a.type,
        filename: a.filename,
        disposition: a.disposition,
        content_id: a.contentId,
      })),
    };

    const client = new ClickSendClient(ctx);
    const data = await client.data<SendEmailResponse>("/email/send", {
      method: "POST",
      body: compact(body as unknown as Record<string, unknown>),
    });

    return {
      messageId: data.message_id,
      status: data.status,
      statusText: data.status_text,
      price: data.price,
      currency: data._currency,
    };
  },
};

export default sendEmail;
