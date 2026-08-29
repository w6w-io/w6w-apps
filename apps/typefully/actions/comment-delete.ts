import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import {
  commentIdParam,
  commentThreadIdParam,
  draftIdParam,
  socialSetIdParam,
} from "../lib/params.ts";

interface Input {
  socialSetId: number;
  draftId: number;
  commentThreadId: string;
  commentId: string;
}

/**
 * `DELETE …/comment-threads/{comment_thread_id}/comments/{comment_id}` —
 * delete one comment. If it is the *root* (oldest) comment in the thread, the
 * whole thread is deleted along with its markers — use
 * `comment-thread-delete` when that cascade is the actual intent, since a
 * generic comment delete having that side effect is easy to miss. Requires
 * authorship of the comment, or WRITE access on the social set. Answers `204`.
 *
 * `idempotent: true` — deleting an already-deleted comment answers `404`
 * rather than corrupting anything.
 */
const commentDelete: ActionDefinition<Input> = {
  key: "comment-delete",
  type: "perform",
  resource: "comment",
  title: "Delete Comment",
  description: "Delete a comment. Deleting the thread's root comment deletes the whole thread.",
  idempotent: true,
  params: [socialSetIdParam, draftIdParam, commentThreadIdParam, commentIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status (204)" }],

  async execute(input, ctx) {
    const status = await new TypefullyClient(ctx).status(
      `/social-sets/${input.socialSetId}/drafts/${input.draftId}` +
        `/comment-threads/${input.commentThreadId}/comments/${input.commentId}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default commentDelete;
