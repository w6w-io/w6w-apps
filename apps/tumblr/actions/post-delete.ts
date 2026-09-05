import type { ActionDefinition } from "@w6w/types";
import { encodeId, TumblrClient } from "../lib/client.ts";
import { blogIdentifierParam } from "../lib/params.ts";

/**
 * `POST /v2/blog/{blog-identifier}/post/delete` — permanently delete a post.
 * Documented "OAuth" auth level. Despite the `POST` verb this is a delete: it
 * takes the post id in the request body, not the path.
 */
interface Input {
  blogIdentifier: string;
  id: number;
}

const postDelete: ActionDefinition<Input> = {
  key: "post-delete",
  type: "perform",
  resource: "post",
  title: "Delete Post",
  description: "Permanently delete a post.",
  idempotent: true,
  params: [
    blogIdentifierParam,
    { key: "id", label: "Post ID", type: "number", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new TumblrClient(ctx).status(
      `/blog/${encodeId(input.blogIdentifier)}/post/delete`,
      { method: "POST", body: { id: input.id } },
    );
    return { status };
  },
};

export default postDelete;
