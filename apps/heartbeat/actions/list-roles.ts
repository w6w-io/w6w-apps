import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/roles` — every role defined in the community. Also this app's auth probe. */
const listRoles: ActionDefinition<Record<string, never>> = {
  key: "list-roles",
  type: "read",
  resource: "role",
  title: "List Roles",
  description: "Return every role defined in the community.",
  params: [],
  output: [{ key: "roles", type: "array", label: "Roles — [{id, name}]" }],

  async execute(_input, ctx) {
    const roles = await new HeartbeatClient(ctx).json("/roles");
    return { roles };
  },
};

export default listRoles;
