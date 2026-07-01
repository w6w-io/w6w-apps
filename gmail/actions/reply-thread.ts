import type { ActionDefinition } from "@w6w/types";
import { buildMimeMessage, GmailClient } from "../lib/client.ts";

interface Input {
  threadId: string;
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

interface ThreadResponse {
  id: string;
  messages: Array<{ payload: { headers: HeaderPair[] } }>;
}

interface Profile {
  emailAddress: string;
}

/**
 * Reply to the last message in a thread. Fetches the thread's terminal
 * message to pull headers, then delegates to `messages/send` with `threadId`
 * so Gmail knits it back in.
 */
const replyThread: ActionDefinition<Input> = {
  key: "reply-thread",
  type: "perform",
  resource: "thread",
  title: "Reply to Thread",
  description: "Reply to the latest message in a Gmail thread.",
  params: [
    { key: "threadId", label: "Thread ID", type: "string", required: true },
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
    },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    const thread = await client.request<ThreadResponse>(
      `/users/me/threads/${input.threadId}`,
      { query: { format: "metadata" } },
    );
    if (!thread.messages?.length) {
      throw new Error(`reply-thread: thread ${input.threadId} has no messages`);
    }
    const last = thread.messages[thread.messages.length - 1];
    const findHeader = (name: string) =>
      last.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

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
      body: { raw, threadId: thread.id },
    });
  },
};

export default replyThread;
