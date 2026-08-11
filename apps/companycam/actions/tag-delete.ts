import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `DELETE /v2/tags/{id}` — delete a tag. Answers `204` with no body.
 *
 * The tag disappears from every photo and project carrying it. Nothing in the
 * documented API restores it, and re-creating one with the same display value
 * produces a new id — so anything storing tag ids will not re-attach itself.
 *
 * Idempotent.
 */
interface Input {
  tagId: string;
}

const tagDelete: ActionDefinition<Input> = {
  key: "tag-delete",
  type: "perform",
  resource: "tag",
  title: "Delete Tag",
  description: "Delete a tag, removing it from every photo and project that carries it.",
  idempotent: true,
  params: [
    { key: "tagId", label: "Tag ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status (204 on success)" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).status(`/tags/${encodeId(input.tagId)}`, {
      method: "DELETE",
    });
  },
};

export default tagDelete;
