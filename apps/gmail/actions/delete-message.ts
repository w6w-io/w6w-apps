import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/**
 * Permanently delete a message — no trash step, no undo. Callers usually want
 * `messages/trash` (not yet exposed here) unless they really want it gone.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.messages/delete
 */
const deleteMessage: ActionDefinition<Input> = {
  key: "delete-message",
  type: "perform",
  resource: "message",
  title: "Delete Message",
  description: "Permanently delete a Gmail message.",
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    await client.request(`/users/me/messages/${input.messageId}`, { method: "DELETE" });
    return { success: true };
  },
};

export default deleteMessage;
