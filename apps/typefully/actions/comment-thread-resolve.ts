import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import { commentThreadIdParam, draftIdParam, socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  draftId: number;
  commentThreadId: string;
}

/**
 * `POST …/comment-threads/{comment_thread_id}/resolve` — resolve a thread and
 * remove its comment markers from the draft text. There is no unresolve
 * endpoint — resolution is one-way.
 *
 * `idempotent: true` — resolving an already-resolved thread is a no-op the
 * server can safely repeat rather than a distinct action each time.
 */
const commentThreadResolve: ActionDefinition<Input> = {
  key: "comment-thread-resolve",
  type: "perform",
  resource: "comment-thread",
  title: "Resolve Comment Thread",
  description: "Resolve a comment thread and strip its markers from the draft text. One-way.",
  idempotent: true,
  params: [socialSetIdParam, draftIdParam, commentThreadIdParam],
  output: [
    { key: "id", type: "string", label: "Comment thread ID" },
    { key: "status", type: "string", label: "resolved" },
    { key: "comments", type: "array", label: "Comments in the thread" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(
      `/social-sets/${input.socialSetId}/drafts/${input.draftId}` +
        `/comment-threads/${input.commentThreadId}/resolve`,
      { method: "POST" },
    );
  },
};

export default commentThreadResolve;
