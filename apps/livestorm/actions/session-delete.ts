import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const sessionDelete: ActionDefinition<Input> = {
  key: "session-delete",
  type: "perform",
  resource: "session",
  title: "Delete Session",
  description: "Delete a session.",
  idempotent: true,
  params: [{ key: "id", label: "Session ID", type: "string", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new LivestormClient(ctx).status(
      `/sessions/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default sessionDelete;
