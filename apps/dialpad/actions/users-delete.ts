import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId } from "../lib/client.ts";

/**
 * `DELETE /api/v2/users/{id}` — delete a user. Requires a company admin API
 * key.
 *
 * A delete's end state is the same however many times it runs (already-deleted
 * stays deleted), so this is declared idempotent, matching the pack's rule for
 * every other delete action.
 */
interface Input {
  userId: string;
}

const usersDelete: ActionDefinition<Input> = {
  key: "users-delete",
  type: "perform",
  resource: "user",
  title: "Delete User",
  description: "Delete a user by id. Requires a company admin API key.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "state", type: "string", label: "State (deleted)" },
  ],

  execute(input, ctx) {
    ctx.log("info", "deleting user", { userId: input.userId });
    return new DialpadClient(ctx).json(`/users/${encodeId(input.userId)}`, { method: "DELETE" });
  },
};

export default usersDelete;
