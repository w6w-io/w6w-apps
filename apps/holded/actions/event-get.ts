import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoldedClient } from "../lib/client.ts";

/** `GET /events/{eventId}` — one calendar event. */
interface Input {
  eventId: string;
}

const eventGet: ActionDefinition<Input> = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Fetch one calendar event by id.",
  params: [
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Events result.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "name", type: "string", label: "Event name" },
    { key: "contactId", type: "string", label: "Linked contact ID" },
    { key: "contactName", type: "string", label: "Contact name" },
    { key: "kind", type: "string", label: 'Event kind, e.g. "coffee", "call"' },
    { key: "desc", type: "string", label: "Description" },
    { key: "startDate", type: "number", label: "Start, Unix timestamp" },
    { key: "endDate", type: "number", label: "End, Unix timestamp" },
    { key: "status", type: "number", label: "Event status" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "locationDesc", type: "string", label: "Location description" },
    { key: "leadId", type: "string", label: "Linked lead ID" },
    { key: "funnelId", type: "string", label: "Linked funnel ID" },
  ],

  execute(input, ctx) {
    return new HoldedClient(ctx).get<Record<string, unknown>>(
      `/events/${encodeId(input.eventId)}`,
    );
  },
};

export default eventGet;
