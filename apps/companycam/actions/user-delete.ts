import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `DELETE /v2/users/{id}` — remove a user from the company. Answers `204` with
 * no body.
 *
 * The user's photos stay: they carry `creator_id` and `creator_name`, which
 * remain readable after the user is gone. What ends is the user's access.
 *
 * Idempotent.
 */
interface Input {
  userId: string;
  actAs?: string;
}

const userDelete: ActionDefinition<Input> = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete User",
  description: "Remove a user from the company. Their photos and comments remain.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true },
    actAsParam,
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status (204 on success)" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).status(`/users/${encodeId(input.userId)}`, {
      method: "DELETE",
      actAs: input.actAs,
    });
  },
};

export default userDelete;
