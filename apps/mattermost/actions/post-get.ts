import type { ActionDefinition } from "@w6w/types";
import { MattermostClient } from "../lib/client.ts";

/** `GET /api/v4/posts/{post_id}` — one post. */
interface Input {
  postId: string;
  includeDeleted?: boolean;
}

const postGet: ActionDefinition<Input> = {
  key: "post-get",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "Fetch a single post by its id.",
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
    {
      key: "includeDeleted",
      label: "Include deleted",
      type: "boolean",
      hint: "Return the post even if it has been deleted. Requires elevated permissions.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Post id" }],

  execute(input, ctx) {
    return new MattermostClient(ctx).request(
      `/api/v4/posts/${encodeURIComponent(input.postId)}`,
      { query: { include_deleted: input.includeDeleted } },
    );
  },
};

export default postGet;
