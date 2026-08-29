import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { messageOutput } from "../lib/output.ts";
import { postIdParam } from "../lib/params.ts";

/** `POST /v1/posts/delete` — permanently delete a post. */
interface Input {
  postID: string;
}

const postDelete: ActionDefinition<Input> = {
  key: "post-delete",
  type: "perform",
  resource: "post",
  title: "Delete Post",
  description: "Permanently delete a post.",
  idempotent: true,
  params: [postIdParam],
  output: messageOutput,

  async execute(input, ctx) {
    const message = await new CannyClient(ctx).postMessage("/posts/delete", {
      postID: input.postID,
    });
    return { message };
  },
};

export default postDelete;
