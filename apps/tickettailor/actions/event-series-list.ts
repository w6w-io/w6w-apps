import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient, toList } from "../lib/client.ts";
import type { TicketTailorListPage } from "../lib/client.ts";

/**
 * `GET /v1/event_series` — verified against the OpenAPI document's
 * `getAllEventSeries` operation, 2026-09-05.
 */
interface Input {
  status?: string | string[];
  name?: string;
  venue?: string;
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
}

const eventSeriesList: ActionDefinition<Input> = {
  key: "event-series-list",
  type: "read",
  resource: "event-series",
  title: "List Event Series",
  description: "List event series belonging to the box office, paginated.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
        { label: "Sales closed", value: "sales_closed" },
      ],
    },
    { key: "name", label: "Name contains", type: "string" },
    { key: "venue", label: "Venue contains", type: "string" },
    { key: "limit", label: "Limit", type: "number", hint: "Page size." },
    { key: "startingAfter", label: "Starting after (cursor)", type: "string" },
    { key: "endingBefore", label: "Ending before (cursor)", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Event series" },
    { key: "links", type: "object", label: "Pagination links" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<TicketTailorListPage<unknown>>("/event_series", {
      query: {
        status: toList(input.status)?.join(","),
        name: input.name,
        venue: input.venue,
        limit: input.limit,
        starting_after: input.startingAfter,
        ending_before: input.endingBefore,
      },
    });
  },
};

export default eventSeriesList;
