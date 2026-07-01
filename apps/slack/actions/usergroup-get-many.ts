import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  includeDisabled?: boolean;
  includeCount?: boolean;
  includeUsers?: boolean;
}

const userGroupGetMany: ActionDefinition<Input> = {
  key: "usergroup-get-many",
  type: "read",
  resource: "usergroup",
  title: "Get Many User Groups",
  description: "Lists user groups in the workspace (usergroups.list).",
  params: [
    { key: "includeDisabled", label: "Include disabled", type: "boolean" },
    { key: "includeCount", label: "Include count", type: "boolean" },
    { key: "includeUsers", label: "Include users", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ usergroups?: unknown }>("/usergroups.list", {
      query: {
        include_disabled: input.includeDisabled,
        include_count: input.includeCount,
        include_users: input.includeUsers,
      },
    });
    return res.usergroups ?? res;
  },
};

export default userGroupGetMany;
