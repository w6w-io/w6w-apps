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
 * Create a draft. The API wants `{ message: { raw, threadId? } }` — same MIME
 * blob as `messages/send` but wrapped one level deeper.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/create
 */
const createDraft: ActionDefinition<Input> = {
  key: "create-draft",
  type: "perform",
  resource: "draft",
  title: "Create Draft",
  description: "Create a new Gmail draft.",
  params: [
    { key: "to", label: "To", type: "string", required: true },
    { key: "subject", label: "Subject", type: "string" },
    { key: "text", label: "Plain Text Body", type: "text" },
    { key: "html", label: "HTML Body", type: "text" },
    { key: "from", label: "From", type: "string" },
    { key: "cc", label: "CC", type: "string" },
    { key: "bcc", label: "BCC", type: "string" },
    { key: "replyTo", label: "Reply-To", type: "string" },
    { key: "threadId", label: "Thread ID", type: "string" },
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
    const message: Record<string, unknown> = { raw };
    if (input.threadId) message.threadId = input.threadId;
    const client = new GmailClient(ctx);
    return client.request("/users/me/drafts", {
      method: "POST",
      body: { message },
    });
  },
};

export default createDraft;
