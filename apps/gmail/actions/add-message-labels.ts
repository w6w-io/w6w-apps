import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  messageId: string;
  labelIds: string[];
}

/**
 * Attach one or more labels to a message.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.messages/modify
 */
const addMessageLabels: ActionDefinition<Input> = {
  key: "add-message-labels",
  type: "perform",
  resource: "message",
  title: "Add Labels to Message",
  description: "Attach one or more labels to a Gmail message.",
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
    { key: "labelIds", label: "Label IDs", type: "string", repeat: true, required: true },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request(`/users/me/messages/${input.messageId}/modify`, {
      method: "POST",
      body: { addLabelIds: input.labelIds },
    });
  },
};

export default addMessageLabels;
