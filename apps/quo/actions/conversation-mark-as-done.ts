import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/**
 * `POST /v1/conversations/{conversationId}/mark-as-done` — remove a conversation from the
 * inbox without sending a message. Returns the updated conversation object directly (no `data`
 * wrapper — see `lib/client.ts` for why this differs from almost every other endpoint).
 */
interface Input {
  conversationId: string;
}

const conversationMarkAsDone: ActionDefinition<Input> = {
  key: "conversation-mark-as-done",
  type: "perform",
  resource: "conversation",
  title: "Mark Conversation As Done",
  description: "Mark a conversation as done, removing it from the inbox without sending a " +
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
      `/conversations/${encodeURIComponent(input.conversationId)}/mark-as-done`,
      { method: "POST" },
    );
  },
};

export default conversationMarkAsDone;
