import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/**
 * Mark a message as read by removing the built-in `UNREAD` label.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.messages/modify
 */
const markMessageRead: ActionDefinition<Input> = {
  key: "mark-message-read",
  type: "perform",
  resource: "message",
  title: "Mark Message as Read",
  description: "Remove the UNREAD label from a Gmail message.",
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request(`/users/me/messages/${input.messageId}/modify`, {
      method: "POST",
      body: { removeLabelIds: ["UNREAD"] },
    });
  },
};

export default markMessageRead;
