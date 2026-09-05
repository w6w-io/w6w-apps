import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient, toList } from "../lib/client.ts";
import type { TicketTailorListPage } from "../lib/client.ts";

/**
 * `GET /v1/events` — verified against `getAllEvents`, 2026-09-05. Box-office-
 * wide: every event occurrence across every event series, flattened, unlike
 * `event-occurrence-list` which is scoped to one series.
 */
interface Input {
  status?: string | string[];
  name?: string;
  venue?: string;
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
}

const eventList: ActionDefinition<Input> = {
  key: "event-list",
  type: "read",
  resource: "event",
  title: "List Events",
  description: "List event occurrences across the whole box office, paginated.",
  params: [
    {
      key: "status",
      label: "Event series status",
      type: "multiselect",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
        { label: "Sales closed", value: "sales_closed" },
      ],
    },
    { key: "name", label: "Name contains", type: "string" },
    { key: "venue", label: "Venue contains", type: "string" },
    { key: "limit", label: "Limit", type: "number" },
    { key: "startingAfter", label: "Starting after (cursor)", type: "string" },
    { key: "endingBefore", label: "Ending before (cursor)", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Events" },
    { key: "links", type: "object", label: "Pagination links" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<TicketTailorListPage<unknown>>("/events", {
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

export default eventList;
