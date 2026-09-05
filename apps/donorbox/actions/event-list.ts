import type { ActionDefinition } from "@w6w/types";
import { DonorboxClient } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  page?: number;
  per_page?: number;
  order?: string;
}

/**
 * `GET /api/v1/events`.
 *
 * The README documents no resource-specific filter for this endpoint (its
 * "Events" section only shows the bare call and a sample response) — only
 * the generic ordering/pagination params that apply to every endpoint.
 */
const eventList: ActionDefinition<Input> = {
  key: "event-list",
  type: "search",
  resource: "event",
  title: "List Events",
  description: "List ticketed events on the connected Donorbox organization.",
  params: [
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Events" },
  ],

  async execute(input, ctx) {
    const data = await new DonorboxClient(ctx).list("/events", {
      query: paginationQuery(input),
    });
    return { data };
  },
};

export default eventList;
