import type { ActionDefinition } from "@w6w/types";
import { buildMimeMessage, GmailClient } from "../lib/client.ts";

interface Input {
  messageId: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string;
  bcc?: string;
  replyToSenderOnly?: boolean;
}

interface HeaderPair {
  name: string;
  value: string;
}

interface MessageMetadata {
  threadId: string;
  payload: { headers: HeaderPair[] };
}

interface Profile {
  emailAddress: string;
}

/**
 * Reply to a message by ID. We fetch the source message's headers to derive
 * the recipient list, subject (with "Re:" prefix if missing), and the
 * In-Reply-To / References chain needed to keep the thread together, then
 * send a new message with `threadId` set.
 *
 * https://developers.google.com/gmail/api/guides/sending#replying
 */
const replyMessage: ActionDefinition<Input> = {
  key: "reply-message",
  type: "perform",
  resource: "message",
  title: "Reply to Message",
  description: "Reply to a Gmail message and keep it in the same thread.",
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
    { key: "text", label: "Plain Text Body", type: "text" },
    { key: "html", label: "HTML Body", type: "text" },
    { key: "from", label: "From", type: "string" },
    { key: "cc", label: "CC", type: "string" },
    { key: "bcc", label: "BCC", type: "string" },
    {
      key: "replyToSenderOnly",
      label: "Reply to Sender Only",
      type: "boolean",
      default: false,
      hint: "When off, includes original `To` recipients as well.",
    },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    const meta = await client.request<MessageMetadata>(
      `/users/me/messages/${input.messageId}`,
      { query: { format: "metadata" } },
    );

    const findHeader = (name: string) =>
      meta.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

    const originalSubject = findHeader("Subject");
    const messageIdHeader = findHeader("Message-ID") || findHeader("Message-Id");
    const originalFrom = findHeader("From");
    const originalTo = findHeader("To");
    const references = findHeader("References");

    const { emailAddress: self } = await client.request<Profile>("/users/me/profile");

    const recipients = new Set<string>();
    if (originalFrom) recipients.add(originalFrom);
    if (!input.replyToSenderOnly && originalTo) {
      for (const addr of originalTo.split(",")) {
        const trimmed = addr.trim();
        if (trimmed && !trimmed.includes(self)) recipients.add(trimmed);
      }
    }

    const subject = originalSubject.toLowerCase().startsWith("re:")
      ? originalSubject
      : `Re: ${originalSubject}`;

    const raw = buildMimeMessage({
      to: [...recipients].join(", "),
      from: input.from,
      cc: input.cc,
      bcc: input.bcc,
      subject,
      text: input.text,
      html: input.html,
      inReplyTo: messageIdHeader || undefined,
      references: references
        ? `${references} ${messageIdHeader}`.trim()
        : messageIdHeader || undefined,
    });

    return client.request("/users/me/messages/send", {
      method: "POST",
      body: { raw, threadId: meta.threadId },
    });
  },
};

export default replyMessage;
