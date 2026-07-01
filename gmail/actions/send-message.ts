import type { ActionDefinition } from "@w6w/types";
import { buildMimeMessage, GmailClient } from "../lib/client.ts";

interface Input {
  to: string;
  subject?: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  threadId?: string;
}

/**
 * Send a message. Gmail's `messages/send` endpoint takes a base64url-encoded
 * RFC 2822 MIME blob under `{ raw }`. We build that MIME in-memory from the
 * declared params — see lib/client.ts `buildMimeMessage`.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send
 */
const sendMessage: ActionDefinition<Input> = {
  key: "send-message",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send an email via Gmail.",
  params: [
    { key: "to", label: "To", type: "string", required: true },
    { key: "subject", label: "Subject", type: "string" },
    { key: "text", label: "Plain Text Body", type: "text" },
    { key: "html", label: "HTML Body", type: "text" },
    {
      key: "from",
      label: "From",
      type: "string",
      hint: 'Overrides the authenticated user. e.g. "Alice <alice@example.com>".',
    },
    { key: "cc", label: "CC", type: "string" },
    { key: "bcc", label: "BCC", type: "string" },
    { key: "replyTo", label: "Reply-To", type: "string" },
    {
      key: "threadId",
      label: "Thread ID",
      type: "string",
      hint: "Attach to an existing thread.",
    },
  ],

  async execute(input, ctx) {
    const raw = buildMimeMessage({
      to: input.to,
      from: input.from,
      cc: input.cc,
      bcc: input.bcc,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    const body: Record<string, unknown> = { raw };
    if (input.threadId) body.threadId = input.threadId;
    const client = new GmailClient(ctx);
    return client.request("/users/me/messages/send", {
      method: "POST",
      body,
    });
  },
};

export default sendMessage;
