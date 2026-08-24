import type { ActionDefinition } from "@w6w/types";
import { WealthboxClient } from "../lib/client.ts";

interface Input {
  eventId: number;
}

/**
 * `DELETE /v1/events/{id}` — delete a calendar Event. Destructive and
 * irreversible via the API.
 *
 * Idempotent in the sense that matters for retries: deleting an
 * already-deleted Event converges on the same end state.
 */
const deleteEvent: ActionDefinition<Input> = {
  key: "delete-event",
  type: "perform",
  resource: "event",
  title: "Delete Event",
  description: "Delete a calendar Event. Destructive and irreversible.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    ctx.log("warn", "deleting event", { eventId: input.eventId });
    await new WealthboxClient(ctx).request(`/events/${encodeURIComponent(input.eventId)}`, {
      method: "DELETE",
    });
    return {};
  },
};

export default deleteEvent;
