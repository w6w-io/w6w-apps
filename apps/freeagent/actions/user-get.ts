import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient } from "../lib/client.ts";

interface Input {
  userId: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Get a single user by id.",
  params: [
    { key: "userId", label: "User ID", type: "string", required: true },
  ],
  output: [{ key: "user", type: "object", label: "User" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request(`/users/${input.userId}`);
  },
};

export default userGet;
