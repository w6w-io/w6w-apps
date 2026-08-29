import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { postOutput } from "../lib/output.ts";
import { postIdParam, tagIdParam } from "../lib/params.ts";

/** `POST /v1/posts/remove_tag` — remove a tag from a post. */
interface Input {
  postID: string;
  tagID: string;
}

const postRemoveTag: ActionDefinition<Input> = {
  key: "post-remove-tag",
  type: "perform",
  resource: "post",
  title: "Remove Post Tag",
  description: "Remove a tag from a post.",
  idempotent: true,
  params: [postIdParam, tagIdParam],
  output: postOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post("/posts/remove_tag", {
      postID: input.postID,
      tagID: input.tagID,
    });
  },
};

export default postRemoveTag;
