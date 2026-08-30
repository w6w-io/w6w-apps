import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/**
 * `POST /v1/conversations/{conversationId}/mark-as-read` — clear a conversation's unread
 * indicator without sending a message. Returns the updated conversation object directly (no
 * `data` wrapper — see `lib/client.ts`).
 */
interface Input {
  conversationId: string;
}

const conversationMarkAsRead: ActionDefinition<Input> = {
  key: "conversation-mark-as-read",
  type: "perform",
  resource: "conversation",
  title: "Mark Conversation As Read",
  description: "Mark a conversation as read, clearing its unread indicator without sending a " +
    "message.",
  idempotent: true,
  params: [
    {
      key: "conversationId",
      label: "Conversation ID",
      type: "string",
      required: true,
      placeholder: "CN123abc",
    },
  ],
  output: [
    {
      key: "id",
      type: "string",
      label: "Updated conversation (id, name, phoneNumberId, participants, assignedTo, " +
        "lastActivityAt, mutedUntil, snoozedUntil, createdAt, updatedAt, deletedAt — top-level, " +
        "not wrapped in `data`)",
    },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(
      `/conversations/${encodeURIComponent(input.conversationId)}/mark-as-read`,
      { method: "POST" },
    );
  },
};

export default conversationMarkAsRead;
