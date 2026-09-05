import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/find/users?email=` — look a member up by email instead of id. */
interface Input {
  email: string;
}

const findUser: ActionDefinition<Input> = {
  key: "find-user",
  type: "search",
  resource: "user",
  title: "Find User by Email",
  description: "Look up a member by email address.",
  params: [{ key: "email", label: "Email", type: "string", required: true }],
  output: [{ key: "users", type: "array", label: "Matching users (0 or more)" }],

  async execute(input, ctx) {
    const users = await new HeartbeatClient(ctx).json("/find/users", {
      query: { email: input.email },
    });
    return { users };
  },
};

export default findUser;
