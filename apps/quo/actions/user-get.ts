import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `GET /v1/users/{userId}` — get a workspace member by their unique identifier. */
interface Input {
  userId: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Get a Quo workspace user by their unique identifier.",
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, placeholder: "US123abc" },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "User (id, email, firstName, lastName, pictureUrl, role, createdAt, updatedAt)",
    },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/users/${encodeURIComponent(input.userId)}`);
  },
};

export default userGet;
