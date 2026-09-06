import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const userDelete: ActionDefinition<Input> = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete Team Member",
  description: "Remove a team member (user) from your organization.",
  idempotent: true,
  params: [{ key: "id", label: "User ID", type: "string", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new LivestormClient(ctx).status(
      `/users/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default userDelete;
