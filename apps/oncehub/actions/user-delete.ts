import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** DELETE /users/{id} → `{ id, deleted: true }`. */
const userDelete: ActionDefinition<Input> = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete User",
  description: "Delete a user by ID (DELETE /users/{id}).",
  idempotent: true,
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],
  params: [
    { key: "id", label: "User ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(`/users/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default userDelete;
