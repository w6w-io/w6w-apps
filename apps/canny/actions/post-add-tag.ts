import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { postOutput } from "../lib/output.ts";
import { postIdParam, tagIdParam } from "../lib/params.ts";

/** `POST /v1/posts/add_tag` — tag a post. */
interface Input {
  postID: string;
  tagID: string;
}

const postAddTag: ActionDefinition<Input> = {
  key: "post-add-tag",
  type: "perform",
  resource: "post",
  title: "Add Post Tag",
  description: "Assign a tag to a post.",
  idempotent: true,
  params: [postIdParam, tagIdParam],
  output: postOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post("/posts/add_tag", {
      postID: input.postID,
      tagID: input.tagID,
    });
  },
};

export default postAddTag;
