import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/** `GET /v1/event_series/{event_series_id}/events/{event_occurrence_id}` — verified 2026-09-05. */
interface Input {
  eventSeriesId: string;
  eventOccurrenceId: string;
}

const eventOccurrenceGet: ActionDefinition<Input> = {
  key: "event-occurrence-get",
  type: "read",
  resource: "event-occurrence",
  title: "Get Event Occurrence",
  description: "Fetch a single event occurrence within an event series.",
  params: [
    {
      key: "eventSeriesId",
      label: "Event Series ID",
      type: "string",
      required: true,
      placeholder: "es_123",
    },
    {
      key: "eventOccurrenceId",
      label: "Event Occurrence ID",
      type: "string",
      required: true,
      placeholder: "ev_123",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Event occurrence ID" },
    { key: "start_date", type: "object", label: "Start date/time" },
    { key: "end_date", type: "object", label: "End date/time" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(
      `/event_series/${encodeURIComponent(input.eventSeriesId)}/events/${
        encodeURIComponent(input.eventOccurrenceId)
      }`,
    );
  },
};

export default eventOccurrenceGet;
