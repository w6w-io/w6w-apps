import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  groupKey: string;
  email?: string;
  name?: string;
  description?: string;
}

const updateGroup: ActionDefinition<Input> = {
  key: "group-update",
  type: "perform",
  resource: "group",
  title: "Update Group",
  description: "Patch a group's fields. Only the fields supplied are changed.",
  idempotent: true,
  params: [
    { key: "groupKey", label: "Group Key", type: "string", required: true },
    { key: "email", label: "Group Email", type: "string" },
    { key: "name", label: "Display Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.email !== undefined) body.email = input.email;
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    return client.request(`/groups/${encodeURIComponent(input.groupKey)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default updateGroup;
