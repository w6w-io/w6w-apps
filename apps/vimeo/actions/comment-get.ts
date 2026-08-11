import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, VimeoClient } from "../lib/client.ts";
import { fieldsParam, videoIdParam } from "../lib/params.ts";

/**
 * `GET /videos/{video_id}/comments/{comment_id}` — one comment.
 *
 * Both ids are required: a comment is addressed through its video, not on its
 * own. `404` covers both "no such video" and "no such comment".
 */
interface Input {
  videoId: string;
  commentId: string;
  fields?: string;
}

const commentGet: ActionDefinition<Input> = {
  key: "comment-get",
  type: "read",
  resource: "comment",
  title: "Get Video Comment",
  description: "Fetch a single comment on a video.",
  params: [
    videoIdParam,
    { key: "commentId", label: "Comment ID", type: "string", required: true, placeholder: "12345" },
    fieldsParam,
  ],
  output: [
    { key: "uri", type: "string", label: "The comment's canonical URI" },
    { key: "text", type: "string", label: "The comment as plain text" },
    { key: "user", type: "object", label: "Who wrote it" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).request(
      `/videos/${idFromRef(input.videoId, "Video ID")}/comments/${
        idFromRef(input.commentId, "Comment ID")
      }`,
      { query: { fields: toCsv(input.fields) } },
    );
  },
};

export default commentGet;
