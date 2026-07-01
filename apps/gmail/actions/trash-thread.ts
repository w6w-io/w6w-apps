import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  threadId: string;
}

/**
 * Move a thread to Trash — reversible via untrash-thread.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.threads/trash
 */
const trashThread: ActionDefinition<Input> = {
  key: "trash-thread",
  type: "perform",
  resource: "thread",
  title: "Trash Thread",
  description: "Move a Gmail thread to the Trash label.",
  params: [
    { key: "threadId", label: "Thread ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request(`/users/me/threads/${input.threadId}/trash`, { method: "POST" });
  },
};

export default trashThread;
