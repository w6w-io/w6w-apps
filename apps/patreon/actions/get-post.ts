import type { ActionDefinition } from "@w6w/types";
import { PatreonClient } from "../lib/client.ts";

interface Input {
  postId: string;
  include?: string;
  postFields?: string;
}

const getPost: ActionDefinition<Input> = {
  key: "get-post",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "Fetch a single post by ID (GET /posts/{id}). Requires the `campaigns.posts` scope.",
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
    {
      key: "include",
      label: "Include related resources",
      type: "string",
      hint: "CSV: campaign, user",
    },
    { key: "postFields", label: "Post fields", type: "string", hint: "CSV" },
  ],
  output: [
    { key: "data.id", type: "string", label: "Post ID" },
    { key: "data.attributes", type: "object", label: "Post attributes" },
  ],

  execute(input, ctx) {
    return new PatreonClient(ctx).request(`/posts/${encodeURIComponent(input.postId)}`, {
      query: {
        include: input.include,
        "fields[post]": input.postFields,
      },
    });
  },
};

export default getPost;
