import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/** `DELETE /api/v2/schedules/{id}` — answers `204` with no body on success. */
interface Input {
  id: number;
}

const scheduleDelete: ActionDefinition<Input> = {
  key: "schedule-delete",
  type: "perform",
  resource: "schedule",
  title: "Delete Scheduled Message",
  description: "Cancel a scheduled (future or recurring) message.",
  idempotent: true,
  params: [{ key: "id", label: "Schedule ID", type: "number", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const status = await new TextMagicClient(ctx).status(
      `/schedules/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default scheduleDelete;
