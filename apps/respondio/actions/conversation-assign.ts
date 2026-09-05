import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, RespondioClient } from "../lib/client.ts";

/**
 * `POST /contact/{identifier}/conversation/assignee` — `ConversationClient.assign`
 * in the official SDK. `AssignConversationRequest.assignee` is
 * `string | number | null` — a user id, a user email, or `null` to unassign.
 * This action accepts one text field and infers which: all-digits is treated
 * as a numeric user id, anything else (including empty, meaning unassign) is
 * passed through as-is.
 */
interface Input {
  identifier: string;
  assignee?: string;
}

const conversationAssign: ActionDefinition<Input> = {
  key: "conversation-assign",
  type: "perform",
  resource: "conversation",
  title: "Assign Conversation",
  description: "Assign a contact's conversation to a user, or unassign it.",
  idempotent: true,
  params: [
    { key: "identifier", label: "Contact identifier", type: "string", required: true },
    {
      key: "assignee",
      label: "Assignee",
      type: "string",
      hint: "A user id or user email. Leave empty to unassign the conversation.",
    },
  ],
  output: [{ key: "contactId", type: "number", label: "Contact ID" }],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    const raw = input.assignee?.trim();
    const assignee = !raw ? null : /^\d+$/.test(raw) ? Number(raw) : raw;
    return new RespondioClient(ctx).post(`/contact/${identifier}/conversation/assignee`, {
      assignee,
    });
  },
};

export default conversationAssign;
