import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  threadId: string;
}

/**
 * Restore a thread from Trash.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.threads/untrash
 */
const untrashThread: ActionDefinition<Input> = {
  key: "untrash-thread",
  type: "perform",
  resource: "thread",
  title: "Untrash Thread",
  description: "Restore a Gmail thread from the Trash label.",
  params: [
    { key: "threadId", label: "Thread ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request(`/users/me/threads/${input.threadId}/untrash`, { method: "POST" });
  },
};

export default untrashThread;
