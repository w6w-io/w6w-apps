import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import { commentThreadIdParam, draftIdParam, socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  draftId: number;
  commentThreadId: string;
  text: string;
}

/**
 * `POST …/comment-threads/{comment_thread_id}/comments` — append a comment to
 * an existing thread. Returns the full updated thread. Fails `409 CONFLICT`
 * on a resolved thread or one on an auto-synced platform (autosync would
 * orphan it). Mentioning users in a comment body is not supported via API v2.
 *
 * Not `idempotent`: each call appends a new comment.
 */
const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Add Comment",
  description: "Append a comment to an existing comment thread.",
  idempotent: false,
  params: [
    socialSetIdParam,
    draftIdParam,
    commentThreadIdParam,
    {
      key: "text",
      label: "Comment Text",
      type: "text",
      required: true,
      validation: { minLength: 1, maxLength: 10000 },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Comment thread ID" },
    { key: "status", type: "string", label: "unresolved | resolved" },
    { key: "comments", type: "array", label: "All comments in the thread, including the new one" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(
      `/social-sets/${input.socialSetId}/drafts/${input.draftId}` +
        `/comment-threads/${input.commentThreadId}/comments`,
      { method: "POST", body: { text: input.text } },
    );
  },
};

export default commentCreate;
