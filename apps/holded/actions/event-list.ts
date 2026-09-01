import type { ActionDefinition } from "@w6w/types";
import { HoldedClient } from "../lib/client.ts";

/**
 * `GET /events` — every calendar event (meeting, call, reminder) on the
 * account.
 *
 * No query parameter is documented — no page, no date range, no `leadId`
 * filter — so this returns the account's full set of events in one call.
 */
type Input = Record<string, never>;

const eventList: ActionDefinition<Input> = {
  key: "event-list",
  type: "read",
  resource: "event",
  title: "List Events",
  description: "Get all of the account's calendar events.",
  params: [],
  output: [{ key: "events", type: "array", label: "Events" }],

  async execute(_input, ctx) {
    const events = await new HoldedClient(ctx).get<unknown[]>("/events");
    return { events };
  },
};

export default eventList;
