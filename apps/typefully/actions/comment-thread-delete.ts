import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import { commentThreadIdParam, draftIdParam, socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  draftId: number;
  commentThreadId: string;
}

/**
 * `DELETE …/comment-threads/{comment_thread_id}` — delete a thread along with
 * every comment in it and strip the corresponding markers from the draft
 * text. Requires authorship of the thread, or WRITE access on the social set.
 * Answers `204`.
 *
 * `idempotent: true` — deleting an already-deleted thread answers `404`
 * rather than corrupting anything.
 */
const commentThreadDelete: ActionDefinition<Input> = {
  key: "comment-thread-delete",
  type: "perform",
  resource: "comment-thread",
  title: "Delete Comment Thread",
  description: "Delete a comment thread and all its comments.",
  idempotent: true,
  params: [socialSetIdParam, draftIdParam, commentThreadIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status (204)" }],

  async execute(input, ctx) {
    const status = await new TypefullyClient(ctx).status(
      `/social-sets/${input.socialSetId}/drafts/${input.draftId}` +
        `/comment-threads/${input.commentThreadId}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default commentThreadDelete;
