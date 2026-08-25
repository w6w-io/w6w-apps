import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { userKeyParam } from "../lib/params.ts";

/** `GET /users/{userKey}` — the public details for another user. */
interface Input {
  userKey: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch the public profile for a Streak user by key.",
  params: [userKeyParam],
  output: [{ key: "data", type: "object", label: "The user" }],

  execute(input, ctx) {
    return new StreakClient(ctx).get(`/users/${encodeId(input.userKey)}`);
  },
};

export default userGet;
