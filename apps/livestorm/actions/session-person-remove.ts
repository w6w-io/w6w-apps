import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";

interface Input {
  id: string;
  peopleId: string;
}

const sessionPersonRemove: ActionDefinition<Input> = {
  key: "session-person-remove",
  type: "perform",
  resource: "session",
  title: "Remove Session Person",
  description: "Remove a participant from a session, identified by Person (People) ID.",
  idempotent: true,
  params: [
    { key: "id", label: "Session ID", type: "string", required: true },
    { key: "peopleId", label: "People ID", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new LivestormClient(ctx).status(
      `/sessions/${encodeURIComponent(input.id)}/people/${encodeURIComponent(input.peopleId)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default sessionPersonRemove;
