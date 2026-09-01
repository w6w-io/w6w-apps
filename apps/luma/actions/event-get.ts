import type { ActionDefinition } from "@w6w/types";
import { LumaClient } from "../lib/client.ts";
import { eventIdParam } from "../lib/params.ts";

interface Input {
  eventId: string;
}

/**
 * `GET /v1/events/get`.
 *
 * The response is a Luma-managed event (`EventDetailForManage`) when the
 * connected key manages it, or a trimmed `EventDetailForView` (location
 * obfuscated, host-only fields omitted) when the calendar only lists it. This
 * app passes either shape straight through rather than picking one.
 */
const eventGet: ActionDefinition<Input> = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Fetch one event's full detail by ID.",
  params: [eventIdParam],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "URL" },
    { key: "start_at", type: "string", label: "Start at" },
    { key: "end_at", type: "string", label: "End at" },
    { key: "timezone", type: "string", label: "Timezone" },
    { key: "visibility", type: "string", label: "Visibility" },
  ],

  execute(input, ctx) {
    return new LumaClient(ctx).json("/v1/events/get", { query: { event_id: input.eventId } });
  },
};

export default eventGet;
