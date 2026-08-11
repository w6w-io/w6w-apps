import type { ActionDefinition } from "@w6w/types";
import { idFromRef, VimeoClient } from "../lib/client.ts";
import { videoIdParam } from "../lib/params.ts";

/**
 * `DELETE /videos/{video_id}/comments/{comment_id}` — delete a comment.
 *
 * The connected account must own the comment; `403` with Vimeo error code 3415
 * is "the authenticated user can't delete this comment". There is one oddity
 * worth knowing, straight from the reference's own response table: a `404` here
 * can mean error code 5000, "the comment **wasn't deleted and still exists**" —
 * so a 404 from this endpoint is not automatically the reassuring
 * already-gone kind.
 *
 * Answers `204`. `idempotent: true`.
 */
interface Input {
  videoId: string;
  commentId: string;
}

const commentDelete: ActionDefinition<
  Input,
  { deleted: boolean; videoId: string; commentId: string }
> = {
  key: "comment-delete",
  type: "perform",
  resource: "comment",
  title: "Delete Video Comment",
  description: "Delete a comment. The connected account must be its author.",
  idempotent: true,
  params: [
    videoIdParam,
    { key: "commentId", label: "Comment ID", type: "string", required: true, placeholder: "12345" },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the delete succeeded" },
    { key: "videoId", type: "string", label: "The video ID" },
    { key: "commentId", type: "string", label: "The deleted comment ID" },
  ],

  async execute(input, ctx) {
    const videoId = idFromRef(input.videoId, "Video ID");
    const commentId = idFromRef(input.commentId, "Comment ID");
    await new VimeoClient(ctx).request(`/videos/${videoId}/comments/${commentId}`, {
      method: "DELETE",
    });
    return { deleted: true, videoId, commentId };
  },
};

export default commentDelete;
