import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";
import type { TicketTailorListPage } from "../lib/client.ts";

/** `GET /v1/event_series/{event_series_id}/events` — verified against `getAllEventOccurrences`, 2026-09-05. */
interface Input {
  eventSeriesId: string;
  overrideId?: string;
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
}

const eventOccurrenceList: ActionDefinition<Input> = {
  key: "event-occurrence-list",
  type: "read",
  resource: "event-occurrence",
  title: "List Event Occurrences",
  description: "List the individual event occurrences (dates) belonging to an event series.",
  params: [
    {
      key: "eventSeriesId",
      label: "Event Series ID",
      type: "string",
      required: true,
      placeholder: "es_123",
    },
    { key: "overrideId", label: "Override ID", type: "string" },
    { key: "limit", label: "Limit", type: "number" },
    { key: "startingAfter", label: "Starting after (cursor)", type: "string" },
    { key: "endingBefore", label: "Ending before (cursor)", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Event occurrences" },
    { key: "links", type: "object", label: "Pagination links" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<TicketTailorListPage<unknown>>(
      `/event_series/${encodeURIComponent(input.eventSeriesId)}/events`,
      {
        query: {
          override_id: input.overrideId,
          limit: input.limit,
          starting_after: input.startingAfter,
          ending_before: input.endingBefore,
        },
      },
    );
  },
};

export default eventOccurrenceList;
