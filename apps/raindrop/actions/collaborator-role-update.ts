import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient } from "../lib/client.ts";
import { collaboratorRoleOptions, collectionPathIdParam } from "../lib/params.ts";

/**
 * `PUT /rest/v1/collection/{id}/sharing/{userId}` — change one collaborator's
 * access level.
 *
 * `userId` is the collaborator's Raindrop user id — the `_id` of a record from
 * List Collaborators, not their email address.
 *
 * Idempotent: setting a role that is already set converges on the same state.
 */
interface Input {
  id: number;
  userId: number;
  role: string;
}

const collaboratorRoleUpdate: ActionDefinition<Input> = {
  key: "collaborator-role-update",
  type: "perform",
  resource: "sharing",
  title: "Change Collaborator Role",
  description: "Promote a collaborator to member (write) or demote them to viewer (read-only).",
  idempotent: true,
  params: [
    collectionPathIdParam,
    {
      key: "userId",
      label: "Collaborator user ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The `_id` from List Collaborators — a user ID, not an email address.",
    },
    {
      key: "role",
      label: "Access level",
      type: "select",
      required: true,
      options: collaboratorRoleOptions,
    },
  ],
  output: [{ key: "result", type: "boolean", label: "Role changed" }],

  async execute(input, ctx) {
    const body = await new RaindropClient(ctx).ok(
      `/collection/${encodeId(input.id)}/sharing/${encodeId(input.userId)}`,
      { method: "PUT", body: { role: input.role } },
    );
    return { result: body.result !== false };
  },
};

export default collaboratorRoleUpdate;
