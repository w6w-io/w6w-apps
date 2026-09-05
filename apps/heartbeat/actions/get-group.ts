import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/groups/{groupID}` — a single group, including its member list. */
interface Input {
  groupID: string;
}

const getGroup: ActionDefinition<Input> = {
  key: "get-group",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Fetch a single group, including its members.",
  params: [{ key: "groupID", label: "Group ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "color", type: "string", label: "Hex color" },
    { key: "parentGroupID", type: "string", label: "Parent group ID, or null" },
    { key: "users", type: "array", label: "Members — [{id, name, email}]" },
    { key: "archived", type: "boolean", label: "Whether the group is archived" },
  ],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(`/groups/${encodeURIComponent(input.groupID)}`);
  },
};

export default getGroup;
