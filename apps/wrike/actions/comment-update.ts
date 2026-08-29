import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";
import { commentIdParam } from "../lib/params.ts";

/**
 * `PUT /comments/{commentId}` — edit a comment's text.
 *
 * **A comment is editable only during the 5 minutes after it was created** —
 * this is Wrike's own stated constraint for this endpoint, not a limitation
 * of this app. Past that window the request fails; there is no override.
 */
interface Input {
  commentId: string;
  text: string;
  plainText?: boolean;
}

const commentUpdate: ActionDefinition<Input> = {
  key: "comment-update",
  type: "perform",
  resource: "comment",
  title: "Update Comment",
  description:
    "Edit a comment's text. Only possible within 5 minutes of the comment's creation — a hard " +
    "Wrike platform limit.",
  idempotent: true,
  params: [
    commentIdParam,
    { key: "text", label: "Text", type: "text", required: true },
    { key: "plainText", label: "Plain text", type: "boolean", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "text", type: "string", label: "Text" },
  ],

  execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    return new WrikeClient(ctx, host).one(`/comments/${encodeURIComponent(input.commentId)}`, {
      method: "PUT",
      query: { text: input.text, plainText: input.plainText },
    });
  },
};

export default commentUpdate;
