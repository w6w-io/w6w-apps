import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { messageOutput } from "../lib/output.ts";

/**
 * `POST /v1/users/delete` — delete a user, and every comment and vote they
 * made. If a post they authored has other comments or votes it keeps
 * existing with the author removed; otherwise the post itself is removed.
 */
interface Input {
  id: string;
}

const userDelete: ActionDefinition<Input> = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete User",
  description:
    "Delete a user, including their comments and votes. A post left with no other activity is " +
    "removed along with them.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "User",
      type: "string",
      required: true,
      hint: "The user's unique identifier.",
    },
  ],
  output: messageOutput,

  async execute(input, ctx) {
    const message = await new CannyClient(ctx).postMessage("/users/delete", { id: input.id });
    return { message };
  },
};

export default userDelete;
