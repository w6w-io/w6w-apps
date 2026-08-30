import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

interface Input {
  userId: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieve a particular user by id.",
  params: [userIdParam],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(`/users/${encodeId(input.userId)}`);
  },
};

export default userGet;
