import type { ActionDefinition } from "@w6w/types";
import { compact, idFromRef, toCsv, VimeoClient } from "../lib/client.ts";
import { fieldsParam, videoIdParam } from "../lib/params.ts";

/**
 * `POST /videos/{video_id}/comments/{comment_id}/replies` — reply to a comment.
 *
 * Unlike `create_comment`, where `text` and `richtext` are documented as
 * "either/or", this endpoint marks **`text` required outright** and `richtext`
 * merely optional. So `text` is required here for the vendor's own reason, not
 * by this app's choice.
 *
 * Answers `201`. `idempotent: false` — a retry posts a second reply, and there
 * is no idempotency key to prevent it.
 */
interface Input {
  videoId: string;
  commentId: string;
  text: string;
  richtext?: string;
  fields?: string;
}

const commentReplyCreate: ActionDefinition<Input> = {
  key: "comment-reply-create",
  type: "perform",
  resource: "comment",
  title: "Reply to Video Comment",
  description: "Post a reply to a comment on a video.",
  idempotent: false,
  params: [
    videoIdParam,
    { key: "commentId", label: "Comment ID", type: "string", required: true, placeholder: "12345" },
    { key: "text", label: "Reply", type: "text", required: true, placeholder: "I love this!" },
    {
      key: "richtext",
      label: "Rich text (advanced)",
      type: "code",
      hint: "A stringified ProseMirror document. Vimeo wants the JSON as a string.",
    },
    fieldsParam,
  ],
  output: [
    { key: "uri", type: "string", label: "The new reply's URI" },
    { key: "text", type: "string", label: "The reply as plain text" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).request(
      `/videos/${idFromRef(input.videoId, "Video ID")}/comments/${
        idFromRef(input.commentId, "Comment ID")
      }/replies`,
      {
        method: "POST",
        query: { fields: toCsv(input.fields) },
        body: compact({ text: input.text, richtext: input.richtext }),
      },
    );
  },
};

export default commentReplyCreate;
