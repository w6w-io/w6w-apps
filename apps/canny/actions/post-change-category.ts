import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { postOutput } from "../lib/output.ts";
import { postIdParam } from "../lib/params.ts";

/**
 * `POST /v1/posts/change_category` — reassign, or clear, a post's category.
 *
 * Per Canny's own docs: pass the literal string `"null"` (not an empty
 * field) to remove the post's category.
 */
interface Input {
  postID: string;
  categoryID?: string;
}

const postChangeCategory: ActionDefinition<Input> = {
  key: "post-change-category",
  type: "perform",
  resource: "post",
  title: "Change Post Category",
  description: "Reassign a post's category, or clear it.",
  idempotent: true,
  params: [
    postIdParam,
    {
      key: "categoryID",
      label: "Category",
      type: "string",
      hint: 'The category\'s unique identifier. Pass the literal string "null" to remove the ' +
        "post's category.",
    },
  ],
  output: postOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post("/posts/change_category", {
      postID: input.postID,
      categoryID: input.categoryID,
    });
  },
};

export default postChangeCategory;
