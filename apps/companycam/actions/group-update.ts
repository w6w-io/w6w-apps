import type { ActionDefinition } from "@w6w/types";
import { compact, CompanyCamClient, encodeId, toList } from "../lib/client.ts";

/**
 * `PUT /v2/groups/{id}` — rename a group or set its membership.
 *
 * **`users` replaces the membership, it does not add to it.** The endpoint
 * takes the same `{"group": {…}}` body as create, and a `PUT` states the whole
 * value — so sending one id leaves a group of one. Read the group first if you
 * mean to add someone.
 *
 * Idempotent: the body is a complete statement of what it names.
 */
interface Input {
  groupId: string;
  name?: string;
  users?: string[] | string;
}

const groupUpdate: ActionDefinition<Input> = {
  key: "group-update",
  type: "perform",
  resource: "group",
  title: "Update Group",
  description: "Rename a group or replace its member list. Members are replaced, not appended.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "users",
      label: "Member user IDs",
      type: "string",
      repeat: true,
      hint: "REPLACES the group's membership with exactly these users.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "users", type: "array", label: "Members" },
  ],

  execute(input, ctx) {
    const group = compact({ name: input.name, users: toList(input.users) });
    if (Object.keys(group).length === 0) {
      throw new Error("Nothing to update — set a name, a member list, or both");
    }
    return new CompanyCamClient(ctx).json(`/groups/${encodeId(input.groupId)}`, {
      method: "PUT",
      body: { group },
    });
  },
};

export default groupUpdate;
