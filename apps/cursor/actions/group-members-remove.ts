import type { ActionDefinition } from "@w6w/types";
import { CursorClient, encodeId, toList } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
  userIds: string[] | string;
}

/**
 * `DELETE /teams/groups/:id/members` — remove members from a billing group.
 * Removed members move to the reserved `Unassigned` group, they are not
 * removed from the team itself. Groups synced with SCIM/directory sync
 * reject changes made here. Rate limited to 20 requests/minute per team.
 */
const groupMembersRemove: ActionDefinition<Input> = {
  key: "group-members-remove",
  type: "perform",
  resource: "group",
  title: "Remove Members from Group",
  description: "Remove team members from a billing group. Removed members move to the reserved " +
    "Unassigned group. Groups synced with SCIM cannot be modified here.",
  idempotent: true,
  params: [
    groupIdParam,
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      required: true,
      hint: "Comma-separated encoded user ids to remove.",
    },
  ],
  output: [
    { key: "group", type: "object", label: "The updated billing group" },
  ],

  execute(input, ctx) {
    const userIds = toList(input.userIds);
    if (!userIds?.length) throw new Error("userIds must be a non-empty list");
    return new CursorClient(ctx).delete(`/teams/groups/${encodeId(input.groupId)}/members`, {
      userIds,
    });
  },
};

export default groupMembersRemove;
