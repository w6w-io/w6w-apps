import type { ActionDefinition } from "@w6w/types";
import { WordPressClient } from "../lib/client.ts";

interface Input {
  postId: string;
  password?: string;
  context?: "view" | "embed" | "edit";
}

const postGet: ActionDefinition<Input> = {
  key: "post-get",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "Retrieve a single post by ID.",
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
    { key: "password", label: "Password", type: "secret", hint: "For password-protected posts." },
    {
      key: "context",
      label: "Context",
      type: "select",
      options: [
        { value: "view", label: "View" },
        { value: "embed", label: "Embed" },
        { value: "edit", label: "Edit" },
      ],
    },
  ],

  async execute(input, ctx) {
    const client = WordPressClient.fromConnection(ctx);
    return client.request(`/posts/${input.postId}`, {
      query: { password: input.password, context: input.context },
    });
  },
};

export default postGet;
