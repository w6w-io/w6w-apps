import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/** `GET /v1/events/{event_id}` — verified against `getEventById`, 2026-09-05. */
interface Input {
  eventId: string;
}

const eventGet: ActionDefinition<Input> = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Fetch a single event occurrence by its box-office-wide event ID.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true, placeholder: "ev_123" },
  ],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "event_series_id", type: "string", label: "Parent event series ID" },
    { key: "start_date", type: "object", label: "Start date/time" },
    { key: "end_date", type: "object", label: "End date/time" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(`/events/${encodeURIComponent(input.eventId)}`);
  },
};

export default eventGet;
