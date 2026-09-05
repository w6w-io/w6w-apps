import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `POST /v1/event_series/{event_series_id}` — verified against
 * `updateEventSeriesById`, 2026-09-05. There is no `PATCH`/`PUT` in this API;
 * "update" is a `POST` to the resource's own URL. See `lib/client.ts`.
 */
interface Input {
  eventSeriesId: string;
  name?: string;
  venue?: string;
  description?: string;
  maxTicketsSoldPerOccurrence?: number;
  postalCode?: string;
}

const eventSeriesUpdate: ActionDefinition<Input> = {
  key: "event-series-update",
  type: "perform",
  resource: "event-series",
  title: "Update Event Series",
  description: "Update fields on an existing event series.",
  idempotent: true,
  params: [
    {
      key: "eventSeriesId",
      label: "Event Series ID",
      type: "string",
      required: true,
      placeholder: "es_123",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "venue", label: "Venue", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "maxTicketsSoldPerOccurrence",
      label: "Max tickets sold per occurrence",
      type: "number",
    },
    { key: "postalCode", label: "Postal code", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Event series ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(
      `/event_series/${encodeURIComponent(input.eventSeriesId)}`,
      {
        method: "POST",
        form: {
          name: input.name,
          venue: input.venue,
          description: input.description,
          max_tickets_sold_per_occurrence: input.maxTicketsSoldPerOccurrence,
          postal_code: input.postalCode,
        },
      },
    );
  },
};

export default eventSeriesUpdate;
