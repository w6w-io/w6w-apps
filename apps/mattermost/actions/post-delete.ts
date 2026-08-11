import type { ActionDefinition } from "@w6w/types";
import { MattermostClient } from "../lib/client.ts";

/**
 * `DELETE /api/v4/posts/{post_id}` — delete a post.
 *
 * Mattermost **soft-deletes**: the post gets a `delete_at` timestamp and stops
 * being returned by normal reads, but the row survives until the server's own
 * data-retention policy removes it. That is worth knowing before treating this
 * as a redaction tool — the text is still in the database, and an admin with
 * `include_deleted` can still read it.
 *
 * Idempotent in the sense the runtime cares about: a retry cannot delete a
 * second post, though the second attempt reports the post as already gone.
 */
interface Input {
  postId: string;
}

const postDelete: ActionDefinition<Input> = {
  key: "post-delete",
  type: "perform",
  resource: "post",
  title: "Delete Post",
  description:
    "Delete a post. Mattermost soft-deletes — the post stops being visible but survives until " +
    "the server's retention policy removes it.",
  idempotent: true,
  params: [{ key: "postId", label: "Post ID", type: "string", required: true }],
  output: [{ key: "status", type: "string", label: "`OK` on success" }],

  execute(input, ctx) {
    return new MattermostClient(ctx).request(
      `/api/v4/posts/${encodeURIComponent(input.postId)}`,
      { method: "DELETE" },
    );
  },
};

export default postDelete;
