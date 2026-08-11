import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `DELETE /v2/groups/{id}` — delete a group. Answers `204` with no body.
 *
 * The group goes; its members do not. Anything filtering photos by
 * `group_ids` against this id stops matching.
 *
 * Idempotent.
 */
interface Input {
  groupId: string;
}

const groupDelete: ActionDefinition<Input> = {
  key: "group-delete",
  type: "perform",
  resource: "group",
  title: "Delete Group",
  description: "Delete a group. Its members are not deleted.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status (204 on success)" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).status(`/groups/${encodeId(input.groupId)}`, {
      method: "DELETE",
    });
  },
};

export default groupDelete;
