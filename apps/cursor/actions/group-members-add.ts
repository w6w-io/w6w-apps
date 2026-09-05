import type { ActionDefinition } from "@w6w/types";
import { CursorClient, encodeId, toList } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
  userIds: string[] | string;
}

/**
 * `POST /teams/groups/:id/members` — add existing team members to a billing
 * group. The vendor requires members to already be on the team and not
 * already in another group.
 *
 * Groups synced via SCIM/directory sync reject membership changes made
 * through this route — the doc says those must go through directory sync
 * itself, not through this API. Rate limited to 20 requests/minute per team.
 */
const groupMembersAdd: ActionDefinition<Input> = {
  key: "group-members-add",
  type: "perform",
  resource: "group",
  title: "Add Members to Group",
  description: "Add team members to a billing group. Members must already be on the team and not " +
    "currently assigned to another group. Groups synced with SCIM cannot be modified here.",
  idempotent: true,
  params: [
    groupIdParam,
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      required: true,
      hint: "Comma-separated encoded user ids to add, e.g. user_abc123,user_def456.",
    },
  ],
  output: [
    { key: "group", type: "object", label: "The updated billing group" },
  ],

  execute(input, ctx) {
    const userIds = toList(input.userIds);
    if (!userIds?.length) throw new Error("userIds must be a non-empty list");
    return new CursorClient(ctx).post(`/teams/groups/${encodeId(input.groupId)}/members`, {
      userIds,
    });
  },
};

export default groupMembersAdd;
