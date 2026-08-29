import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  conversationId: string;
  body: string;
}

/**
 * `POST /v1/conversations/{id}/notes` — "Create note within conversation",
 * verified against `CreateaNotewithinConversationRequest` in the Core
 * Resources OAS. `body` is the schema's only required field.
 */
const noteCreate: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Add Note to Conversation",
  description: "Add an internal note to a conversation.",
  idempotent: false,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "string", required: true },
    { key: "body", label: "Note", type: "text", required: true },
  ],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data(
      `/conversations/${encodeURIComponent(input.conversationId)}/notes`,
      { method: "POST", body: { body: input.body } },
    );
  },
};

export default noteCreate;
