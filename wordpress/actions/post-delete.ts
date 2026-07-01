import type { ActionDefinition } from "@w6w/types";
import { WordPressClient } from "../lib/client.ts";

interface Input {
  postId: string;
  force?: boolean;
}

const postDelete: ActionDefinition<Input> = {
  key: "post-delete",
  type: "perform",
  resource: "post",
  title: "Delete Post",
  description: "Move a post to trash, or bypass trash entirely with `force`.",
  idempotent: true,
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
    {
      key: "force",
      label: "Force",
      type: "boolean",
      default: false,
      hint: "Bypass trash and delete permanently.",
    },
  ],

  async execute(input, ctx) {
    const client = WordPressClient.fromConnection(ctx);
    return client.request(`/posts/${input.postId}`, {
      method: "DELETE",
      query: { force: input.force },
    });
  },
};

export default postDelete;
