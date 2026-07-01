import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  messageId: string;
  labelIds: string[];
}

/**
 * Detach one or more labels from a message.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.messages/modify
 */
const removeMessageLabels: ActionDefinition<Input> = {
  key: "remove-message-labels",
  type: "perform",
  resource: "message",
  title: "Remove Labels from Message",
  description: "Detach one or more labels from a Gmail message.",
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
    { key: "labelIds", label: "Label IDs", type: "string", repeat: true, required: true },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request(`/users/me/messages/${input.messageId}/modify`, {
      method: "POST",
      body: { removeLabelIds: input.labelIds },
    });
  },
};

export default removeMessageLabels;
