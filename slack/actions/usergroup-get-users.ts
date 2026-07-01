import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface UserGroup {
  id: string;
  users?: string[];
}

interface Input {
  userGroupId: string;
}

const userGroupGetUsers: ActionDefinition<Input> = {
  key: "usergroup-get-users",
  type: "read",
  resource: "usergroup",
  title: "Get User Group Members",
  description: "Lists user IDs in a user group (usergroups.list?include_users=true, filtered).",
  params: [
    { key: "userGroupId", label: "User group ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ usergroups?: UserGroup[] }>("/usergroups.list", {
      query: { include_users: true, usergroup: input.userGroupId },
    });
    const group = res.usergroups?.find((g) => g.id === input.userGroupId);
    if (!group) throw new Error(`User group with ID "${input.userGroupId}" not found`);
    return group.users ?? [];
  },
};

export default userGroupGetUsers;
