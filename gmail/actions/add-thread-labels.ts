import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  threadId: string;
  labelIds: string[];
}

/**
 * Attach labels to every message in a thread.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.threads/modify
 */
const addThreadLabels: ActionDefinition<Input> = {
  key: "add-thread-labels",
  type: "perform",
  resource: "thread",
  title: "Add Labels to Thread",
  description: "Attach one or more labels to a Gmail thread.",
  params: [
    { key: "threadId", label: "Thread ID", type: "string", required: true },
    { key: "labelIds", label: "Label IDs", type: "string", repeat: true, required: true },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request(`/users/me/threads/${input.threadId}/modify`, {
      method: "POST",
      body: { addLabelIds: input.labelIds },
    });
  },
};

export default addThreadLabels;
