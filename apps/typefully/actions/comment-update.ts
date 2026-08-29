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
  text: string;
}

/**
 * `PATCH …/comment-threads/{comment_thread_id}/comments/{comment_id}` —
 * update a comment's plain-text body. Restricted to the comment's own author
 * — even a user with WRITE access on the social set cannot edit someone
 * else's comment. Editing clears any mentions the comment previously held
 * (mentions in a comment body are not otherwise supported via API v2).
 *
 * `idempotent: true` — setting the same text twice leaves the same result.
 */
const commentUpdate: ActionDefinition<Input> = {
  key: "comment-update",
  type: "perform",
  resource: "comment",
  title: "Update Comment",
  description: "Update the text of a comment you authored.",
  idempotent: true,
  params: [
    socialSetIdParam,
    draftIdParam,
    commentThreadIdParam,
    commentIdParam,
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
    { key: "comments", type: "array", label: "All comments in the thread" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(
      `/social-sets/${input.socialSetId}/drafts/${input.draftId}` +
        `/comment-threads/${input.commentThreadId}/comments/${input.commentId}`,
      { method: "PATCH", body: { text: input.text } },
    );
  },
};

export default commentUpdate;
