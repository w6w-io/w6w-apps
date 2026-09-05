import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/** `GET /v1/event_series/{event_series_id}` — verified 2026-09-05. */
interface Input {
  eventSeriesId: string;
}

const eventSeriesGet: ActionDefinition<Input> = {
  key: "event-series-get",
  type: "read",
  resource: "event-series",
  title: "Get Event Series",
  description: "Fetch a single event series by ID.",
  params: [
    {
      key: "eventSeriesId",
      label: "Event Series ID",
      type: "string",
      required: true,
      placeholder: "es_123",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Event series ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "venue", type: "string", label: "Venue" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "revenue", type: "number", label: "Total revenue" },
    { key: "default_ticket_types", type: "array", label: "Ticket types not overridden per event" },
    {
      key: "default_ticket_groups",
      type: "array",
      label: "Ticket groups not overridden per event",
    },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(
      `/event_series/${encodeURIComponent(input.eventSeriesId)}`,
    );
  },
};

export default eventSeriesGet;
