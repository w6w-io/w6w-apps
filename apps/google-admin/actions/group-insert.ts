import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  email: string;
  name?: string;
  description?: string;
}

const insertGroup: ActionDefinition<Input> = {
  key: "group-insert",
  type: "perform",
  resource: "group",
  title: "Create Group",
  description: "Create a new group in the domain.",
  idempotent: false,
  params: [
    { key: "email", label: "Group Email", type: "string", required: true },
    { key: "name", label: "Display Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    const body: Record<string, unknown> = { email: input.email };
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    return client.request("/groups", { method: "POST", body });
  },
};

export default insertGroup;
