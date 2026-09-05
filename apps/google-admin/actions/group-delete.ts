import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  groupKey: string;
}

const deleteGroup: ActionDefinition<Input> = {
  key: "group-delete",
  type: "perform",
  resource: "group",
  title: "Delete Group",
  description: "Permanently delete a group.",
  idempotent: true,
  params: [
    { key: "groupKey", label: "Group Key", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    await client.request(`/groups/${encodeURIComponent(input.groupKey)}`, { method: "DELETE" });
    return { groupKey: input.groupKey, success: true };
  },
};

export default deleteGroup;
