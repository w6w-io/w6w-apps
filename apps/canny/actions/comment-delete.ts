import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { messageOutput } from "../lib/output.ts";

/** `POST /v1/comments/delete` — permanently delete a portal comment. */
interface Input {
  commentID: string;
}

const commentDelete: ActionDefinition<Input> = {
  key: "comment-delete",
  type: "perform",
  resource: "comment",
  title: "Delete Comment",
  description: "Permanently delete a portal comment.",
  idempotent: true,
  params: [
    {
      key: "commentID",
      label: "Comment",
      type: "string",
      required: true,
      hint: "The comment's unique identifier.",
    },
  ],
  output: messageOutput,

  async execute(input, ctx) {
    const message = await new CannyClient(ctx).postMessage("/comments/delete", {
      commentID: input.commentID,
    });
    return { message };
  },
};

export default commentDelete;
