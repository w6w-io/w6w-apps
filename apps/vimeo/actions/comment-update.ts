import type { ActionDefinition } from "@w6w/types";
import { compact, idFromRef, toCsv, VimeoClient } from "../lib/client.ts";
import { fieldsParam, videoIdParam } from "../lib/params.ts";

/**
 * `PATCH /videos/{video_id}/comments/{comment_id}` — edit a comment.
 *
 * The same `text` / `richtext` pair as `comment-create`, with the same rule
 * (one of the two is required; neither is a `400` with error code 2207) and the
 * same reason `richtext` is a `code` param rather than `json`.
 *
 * The connected account must be the comment's author. Beyond the shared spam
 * and permission refusals, this endpoint adds `403` error code 3414 — the
 * account cannot edit **this** comment, as distinct from 3412's "cannot post
 * comments at all".
 *
 * `idempotent: true` — setting the same text twice is one edit.
 */
interface Input {
  videoId: string;
  commentId: string;
  text: string;
  richtext?: string;
  fields?: string;
}

const commentUpdate: ActionDefinition<Input> = {
  key: "comment-update",
  type: "perform",
  resource: "comment",
  title: "Edit Video Comment",
  description: "Edit a comment the connected account wrote.",
  idempotent: true,
  params: [
    videoIdParam,
    { key: "commentId", label: "Comment ID", type: "string", required: true, placeholder: "12345" },
    { key: "text", label: "Comment", type: "text", required: true },
    {
      key: "richtext",
      label: "Rich text (advanced)",
      type: "code",
      hint: "A stringified ProseMirror document. Vimeo wants the JSON as a string.",
    },
    fieldsParam,
  ],
  output: [
    { key: "uri", type: "string", label: "The comment's canonical URI" },
    { key: "text", type: "string", label: "The comment as plain text" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).request(
      `/videos/${idFromRef(input.videoId, "Video ID")}/comments/${
        idFromRef(input.commentId, "Comment ID")
      }`,
      {
        method: "PATCH",
        query: { fields: toCsv(input.fields) },
        body: compact({ text: input.text, richtext: input.richtext }),
      },
    );
  },
};

export default commentUpdate;
