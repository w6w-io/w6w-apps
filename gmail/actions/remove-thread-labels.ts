import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  threadId: string;
  labelIds: string[];
}

/**
 * Detach labels from every message in a thread.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.threads/modify
 */
const removeThreadLabels: ActionDefinition<Input> = {
  key: "remove-thread-labels",
  type: "perform",
  resource: "thread",
  title: "Remove Labels from Thread",
  description: "Detach one or more labels from a Gmail thread.",
  params: [
    { key: "threadId", label: "Thread ID", type: "string", required: true },
    { key: "labelIds", label: "Label IDs", type: "string", repeat: true, required: true },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request(`/users/me/threads/${input.threadId}/modify`, {
      method: "POST",
      body: { removeLabelIds: input.labelIds },
    });
  },
};

export default removeThreadLabels;
