import type { ActionDefinition } from "@w6w/types";
import { CursorClient, encodeId } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
}

/**
 * `DELETE /teams/groups/:id` — delete a billing group. Returns `204`.
 *
 * The doc calls this out as destructive and non-recoverable: all historical
 * usage for the deleted group is reassigned retroactively to the reserved
 * `Unassigned` group. Rate limited to 20 requests/minute per team.
 */
const groupDelete: ActionDefinition<Input> = {
  key: "group-delete",
  type: "perform",
  resource: "group",
  title: "Delete Billing Group",
  description:
    "Delete a billing group. Destructive and not recoverable: historical usage for the group " +
    "is reassigned retroactively to the Unassigned group.",
  idempotent: true,
  params: [groupIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new CursorClient(ctx).delete(`/teams/groups/${encodeId(input.groupId)}`);
    return { deleted: true };
  },
};

export default groupDelete;
