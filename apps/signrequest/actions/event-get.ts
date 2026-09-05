import type { ActionDefinition } from "@w6w/types";
import { SignRequestClient } from "../lib/client.ts";

interface Input {
  eventId: string;
}

/** `GET /events/{uuid}/` — a single event's full payload, including its `document`/`signer` data. */
const eventGet: ActionDefinition<Input> = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Retrieve a single event's full payload.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
  ],
  output: [
    { key: "uuid", type: "string", label: "Event ID" },
    { key: "event_type", type: "string", label: "Event type" },
    { key: "status", type: "string", label: "`ok` or `error`" },
    { key: "delivered", type: "boolean", label: "Delivered to the callback URL" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request(`/events/${encodeURIComponent(input.eventId)}/`);
  },
};

export default eventGet;
