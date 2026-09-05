import type { ActionDefinition } from "@w6w/types";
import { LearnWorldsClient } from "../lib/client.ts";

/** `GET /v2/users/{id}` — a single user by id or email. */
interface Input {
  id: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get a User",
  description: "Get a single user by id or email.",
  params: [
    {
      key: "id",
      label: "User ID or email",
      type: "string",
      required: true,
      hint: "The LearnWorlds user id, or the user's email address.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "username", type: "string", label: "Username" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    return await new LearnWorldsClient(ctx).request(
      `/v2/users/${encodeURIComponent(input.id)}`,
    );
  },
};

export default userGet;
