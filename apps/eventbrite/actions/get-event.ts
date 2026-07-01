import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  expand?: string;
}

const getEvent: ActionDefinition<Input> = {
  key: "get-event",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Retrieve a single event by ID.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "expand", label: "Expand", type: "string", default: "venue,ticket_classes" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${input.eventId}/`, {
      query: { expand: input.expand ?? "venue,ticket_classes" },
    });
  },
};

export default getEvent;
