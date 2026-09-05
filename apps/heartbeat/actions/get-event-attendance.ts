import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/events/{eventID}/attendance` — who attended the last 10 instances. */
interface Input {
  eventID: string;
}

const getEventAttendance: ActionDefinition<Input> = {
  key: "get-event-attendance",
  type: "read",
  resource: "event",
  title: "Get Event Attendance",
  description:
    "Return attendance for the last 10 instances of an event. A non-recurring event returns one " +
    "entry.",
  params: [{ key: "eventID", label: "Event ID", type: "string", required: true }],
  output: [
    {
      key: "attendance",
      type: "array",
      label: "[{startTime, endTime, attendees: [{id?, email?, name, isUser}]}]",
    },
  ],

  async execute(input, ctx) {
    const attendance = await new HeartbeatClient(ctx).json(
      `/events/${encodeURIComponent(input.eventID)}/attendance`,
    );
    return { attendance };
  },
};

export default getEventAttendance;
