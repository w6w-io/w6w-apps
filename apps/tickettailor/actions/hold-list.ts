import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";
import type { TicketTailorListPage } from "../lib/client.ts";

/** `GET /v1/holds` — verified against `getHoldList`, 2026-09-05. */
interface Input {
  eventId?: string;
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
}

const holdList: ActionDefinition<Input> = {
  key: "hold-list",
  type: "read",
  resource: "hold",
  title: "List Holds",
  description: "List ticket holds (reserved-but-not-sold inventory), paginated.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", placeholder: "ev_123" },
    { key: "limit", label: "Limit", type: "number" },
    { key: "startingAfter", label: "Starting after (cursor)", type: "string" },
    { key: "endingBefore", label: "Ending before (cursor)", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Holds" },
    { key: "links", type: "object", label: "Pagination links" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<TicketTailorListPage<unknown>>("/holds", {
      query: {
        event_id: input.eventId,
        limit: input.limit,
        starting_after: input.startingAfter,
        ending_before: input.endingBefore,
      },
    });
  },
};

export default holdList;
