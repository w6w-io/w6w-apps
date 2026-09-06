import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const eventDelete: ActionDefinition<Input> = {
  key: "event-delete",
  type: "perform",
  resource: "event",
  title: "Delete Event",
  description: "Delete an event.",
  idempotent: true,
  params: [{ key: "id", label: "Event ID", type: "string", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new LivestormClient(ctx).status(
      `/events/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default eventDelete;
