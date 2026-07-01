import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  attendeeId: string;
}

const getAttendee: ActionDefinition<Input> = {
  key: "get-attendee",
  type: "read",
  resource: "attendee",
  title: "Get Attendee",
  description: "Retrieve a single attendee by ID.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "attendeeId", label: "Attendee ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${input.eventId}/attendees/${input.attendeeId}/`);
  },
};

export default getAttendee;
