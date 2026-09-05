import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/groups` — every group in the community. */
const listGroups: ActionDefinition<Record<string, never>> = {
  key: "list-groups",
  type: "read",
  resource: "group",
  title: "List Groups",
  description: "Return every group in the community.",
  params: [],
  output: [{ key: "groups", type: "array", label: "Groups" }],

  async execute(_input, ctx) {
    const groups = await new HeartbeatClient(ctx).json("/groups");
    return { groups };
  },
};

export default listGroups;
