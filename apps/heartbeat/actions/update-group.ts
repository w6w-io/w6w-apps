import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient } from "../lib/client.ts";

/** `POST /v0/groups/{groupID}` — edit a group. Only provided fields change. */
interface Input {
  groupID: string;
  name?: string;
  description?: string;
  isIsolated?: boolean;
  isJoinable?: boolean;
}

const updateGroup: ActionDefinition<Input> = {
  key: "update-group",
  type: "perform",
  resource: "group",
  title: "Update Group",
  description: "Edit a group. All fields are optional; only provided fields change.",
  idempotent: true,
  params: [
    { key: "groupID", label: "Group ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "isIsolated", label: "Isolated", type: "boolean" },
    { key: "isJoinable", label: "Joinable", type: "boolean" },
  ],
  output: [],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(`/groups/${encodeURIComponent(input.groupID)}`, {
      method: "POST",
      body: compact({
        name: input.name,
        description: input.description,
        isIsolated: input.isIsolated,
        isJoinable: input.isJoinable,
      }),
    });
  },
};

export default updateGroup;
