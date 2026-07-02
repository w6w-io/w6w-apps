import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  workspace: string;
  opt_fields?: string;
}

const listUsers: ActionDefinition<Input> = {
  key: "list-users",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List users in a workspace.",
  params: [
    { key: "workspace", label: "Workspace ID", type: "string", required: true },
    { key: "opt_fields", label: "Fields", type: "string" },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(`/workspaces/${input.workspace}/users`, {
      query: { opt_fields: input.opt_fields },
    });
  },
};

export default listUsers;
