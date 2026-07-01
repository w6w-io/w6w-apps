import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/**
 * Mark a message as unread by re-adding the built-in `UNREAD` label.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.messages/modify
 */
const markMessageUnread: ActionDefinition<Input> = {
  key: "mark-message-unread",
  type: "perform",
  resource: "message",
  title: "Mark Message as Unread",
  description: "Add the UNREAD label to a Gmail message.",
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request(`/users/me/messages/${input.messageId}/modify`, {
      method: "POST",
      body: { addLabelIds: ["UNREAD"] },
    });
  },
};

export default markMessageUnread;
