import type { ActionDefinition } from "@w6w/types";
import { DatadogClient, encodeSegment } from "../lib/client.ts";

/**
 * `GET /api/v2/events/{event_id}` — one event by id.
 *
 * The v2 id is a **string UID**, not the `int64` the v1 event endpoints use.
 * They are different identifier spaces: an id taken from `event-search` (v2)
 * works here, and an id from a v1 `POST /api/v1/events` response does not
 * necessarily.
 *
 * Datadog's own note on the v1 reads applies to markdown here too: an event
 * whose body carries markdown comes back with literal `%`, `\` and `n`
 * characters in it.
 *
 * Needs the application key and the `events_read` scope.
 */
interface Input {
  eventId: string;
}

const eventGet: ActionDefinition<Input> = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Fetch a single event by its v2 UID.",
  params: [
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      required: true,
      hint: "The v2 UID, as returned in `data[].id` by Search Events. Not the numeric v1 event id.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The event" },
  ],

  execute(input, ctx) {
    return new DatadogClient(ctx).json(`/api/v2/events/${encodeSegment(input.eventId)}`);
  },
};

export default eventGet;
