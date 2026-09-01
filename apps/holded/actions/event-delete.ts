import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoldedClient } from "../lib/client.ts";

/**
 * `DELETE /events/{eventId}` — remove a calendar event.
 *
 * Idempotent in the sense the runtime cares about: the end state after one
 * call and after five is the same event gone.
 */
interface Input {
  eventId: string;
}

const eventDelete: ActionDefinition<Input> = {
  key: "event-delete",
  type: "perform",
  resource: "event",
  title: "Delete Event",
  description: "Delete a calendar event by id.",
  idempotent: true,
  params: [
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Events result.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "Event ID" },
  ],

  execute(input, ctx) {
    return new HoldedClient(ctx).delete(`/events/${encodeId(input.eventId)}`);
  },
};

export default eventDelete;
