import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId } from "../lib/client.ts";

/**
 * `GET /api/v2/users/{id}` — a user's identity, contact details, status,
 * license and office membership.
 *
 * `"me"` is accepted in place of an id when the connection uses a user-level
 * API key.
 */
interface Input {
  userId: string;
}

const usersGet: ActionDefinition<Input> = {
  key: "users-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Get a user by id.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "The user's numeric id, or \"me\" for a user-level API key's own user.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "display_name", type: "string", label: "Display name" },
    { key: "emails", type: "array", label: "Emails" },
    { key: "state", type: "string", label: "State" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json(`/users/${encodeId(input.userId)}`);
  },
};

export default usersGet;
