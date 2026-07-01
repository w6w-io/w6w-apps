import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  userId: string;
}

const getUser: ActionDefinition<Input> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieve a single Notion user by ID.",
  params: [
    { key: "userId", label: "User ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/users/${input.userId}`);
  },
};

export default getUser;
