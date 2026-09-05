import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `DELETE /v0/groups/{groupID}` — delete a group. */
interface Input {
  groupID: string;
}

const deleteGroup: ActionDefinition<Input> = {
  key: "delete-group",
  type: "perform",
  resource: "group",
  title: "Delete Group",
  description: "Delete a group.",
  idempotent: true,
  params: [{ key: "groupID", label: "Group ID", type: "string", required: true }],
  output: [],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(`/groups/${encodeURIComponent(input.groupID)}`, {
      method: "DELETE",
    });
  },
};

export default deleteGroup;
