import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";
import { commentIdParam } from "../lib/params.ts";

/**
 * `DELETE /comments/{commentId}` — delete a comment by ID.
 *
 * Marked idempotent: deleting an already-deleted comment answers
 * `404 resource_not_found` rather than a second side effect.
 */
interface Input {
  commentId: string;
}

const commentDelete: ActionDefinition<Input> = {
  key: "comment-delete",
  type: "perform",
  resource: "comment",
  title: "Delete Comment",
  description: "Delete a comment by ID.",
  idempotent: true,
  params: [commentIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const status = await new WrikeClient(ctx, host).status(
      `/comments/${encodeURIComponent(input.commentId)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default commentDelete;
