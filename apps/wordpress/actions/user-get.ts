import type { ActionDefinition } from "@w6w/types";
import { WordPressClient } from "../lib/client.ts";

interface Input {
  userId: string;
  context?: "view" | "embed" | "edit";
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieve a single user by ID (or `me` for the authenticated user).",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "Pass `me` for the authenticated user.",
    },
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
    return client.request(`/users/${input.userId}`, { query: { context: input.context } });
  },
};

export default userGet;
