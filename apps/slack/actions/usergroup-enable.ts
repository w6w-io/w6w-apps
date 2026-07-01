import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  userGroupId: string;
  includeCount?: boolean;
}

const userGroupEnable: ActionDefinition<Input> = {
  key: "usergroup-enable",
  type: "perform",
  resource: "usergroup",
  title: "Enable User Group",
  description: "Re-enables a previously disabled user group (usergroups.enable).",
  params: [
    { key: "userGroupId", label: "User group ID", type: "string", required: true },
    { key: "includeCount", label: "Include count", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const body: Record<string, unknown> = { usergroup: input.userGroupId };
    if (input.includeCount !== undefined) body.include_count = input.includeCount;
    const res = await client.request<{ usergroup?: unknown }>("/usergroups.enable", {
      method: "POST",
      body,
    });
    return res.usergroup ?? res;
  },
};

export default userGroupEnable;
