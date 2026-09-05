import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  groupKey: string;
  email: string;
  role?: string;
}

const insertMember: ActionDefinition<Input> = {
  key: "member-insert",
  type: "perform",
  resource: "member",
  title: "Add Group Member",
  description: "Add a user (or another group) as a member of a group.",
  idempotent: false,
  params: [
    { key: "groupKey", label: "Group Key", type: "string", required: true },
    { key: "email", label: "Member Email", type: "string", required: true },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "OWNER", label: "Owner" },
        { value: "MANAGER", label: "Manager" },
        { value: "MEMBER", label: "Member" },
      ],
      default: "MEMBER",
    },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    return client.request(`/groups/${encodeURIComponent(input.groupKey)}/members`, {
      method: "POST",
      body: { email: input.email, role: input.role ?? "MEMBER" },
    });
  },
};

export default insertMember;
