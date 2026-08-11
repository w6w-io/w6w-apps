import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `GET /v2/users/{id}` — one user.
 */
interface Input {
  userId: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Retrieve User",
  description: "Fetch one user by id.",
  params: [
    { key: "userId", label: "User ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email_address", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "status", type: "string", label: "Status" },
    { key: "user_url", type: "string", label: "User URL" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/users/${encodeId(input.userId)}`);
  },
};

export default userGet;
