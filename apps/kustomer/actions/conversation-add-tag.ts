import type { ActionDefinition } from "@w6w/types";
import { csv, KustomerClient } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  id: string;
  tags: string;
}

/**
 * `POST /v1/conversations/{id}/tags` — "Append tags to conversation",
 * verified against the Core Resources OAS (`AppendTagstoConversationRequest`,
 * a bare array of tag-name strings).
 *
 * Kustomer's paired `DELETE /v1/conversations/{id}/tags` ("Remove tags from
 * conversation") is left out: its OAS declares no request body and no query
 * parameter naming which tags to remove, so which tags the call actually
 * targets can't be confirmed from the documented shape.
 */
const conversationAddTag: ActionDefinition<Input> = {
  key: "conversation-add-tag",
  type: "perform",
  resource: "conversation",
  title: "Add Tags to Conversation",
  description: "Append one or more tags to a conversation.",
  idempotent: true,
  params: [
    { key: "id", label: "Conversation ID", type: "string", required: true },
    { key: "tags", label: "Tags", type: "string", required: true, hint: "Comma-separated." },
  ],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data(
      `/conversations/${encodeURIComponent(input.id)}/tags`,
      { method: "POST", body: csv(input.tags) ?? [] },
    );
  },
};

export default conversationAddTag;
