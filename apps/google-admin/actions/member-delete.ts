import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  groupKey: string;
  memberKey: string;
}

const deleteMember: ActionDefinition<Input> = {
  key: "member-delete",
  type: "perform",
  resource: "member",
  title: "Remove Group Member",
  description: "Remove a member from a group.",
  idempotent: true,
  params: [
    { key: "groupKey", label: "Group Key", type: "string", required: true },
    { key: "memberKey", label: "Member Key", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    await client.request(
      `/groups/${encodeURIComponent(input.groupKey)}/members/${
        encodeURIComponent(input.memberKey)
      }`,
      { method: "DELETE" },
    );
    return { groupKey: input.groupKey, memberKey: input.memberKey, success: true };
  },
};

export default deleteMember;
