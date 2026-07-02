import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  userId: string;
}

const getUser: ActionDefinition<Input> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description:
    "Retrieve a user by gid, email, or the keyword `me` (current user making the request).",
  params: [
    {
      key: "userId",
      label: "User (gid, email, or `me`)",
      type: "string",
      required: true,
    },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(`/users/${input.userId}`);
  },
};

export default getUser;
