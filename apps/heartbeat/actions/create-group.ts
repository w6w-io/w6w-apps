import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient } from "../lib/client.ts";

/**
 * `PUT /v0/groups` — create a new group.
 *
 * No response schema is documented; whatever body (if any) comes back is
 * passed through unshaped.
 */
interface Input {
  name: string;
  description?: string;
  members?: string[] | string;
  parentGroupID?: string;
  isIsolated?: boolean;
  isJoinable?: boolean;
}

const createGroup: ActionDefinition<Input> = {
  key: "create-group",
  type: "perform",
  resource: "group",
  title: "Create Group",
  description: "Create a new group in the community.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "members",
      label: "Member emails",
      type: "multiselect",
      hint: "Users to add to the new group.",
    },
    { key: "parentGroupID", label: "Parent group ID", type: "string" },
    {
      key: "isIsolated",
      label: "Isolated",
      type: "boolean",
      hint: "See Heartbeat's own group settings docs for what this changes about visibility.",
    },
    {
      key: "isJoinable",
      label: "Joinable",
      type: "boolean",
      hint:
        "See Heartbeat's own group settings docs for what this changes about self-service joining.",
    },
  ],
  output: [],

  execute(input, ctx) {
    const members = Array.isArray(input.members)
      ? input.members
      : input.members
      ? input.members.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    return new HeartbeatClient(ctx).json("/groups", {
      method: "PUT",
      body: compact({
        name: input.name,
        description: input.description,
        members,
        parentGroupID: input.parentGroupID,
        isIsolated: input.isIsolated,
        isJoinable: input.isJoinable,
      }),
    });
  },
};

export default createGroup;
