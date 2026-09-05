import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/events/{eventID}` — a single event. */
interface Input {
  eventID: string;
}

const getEvent: ActionDefinition<Input> = {
  key: "get-event",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Fetch a single event.",
  params: [{ key: "eventID", label: "Event ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    {
      key: "startTime",
      type: "string",
      label: "Start time (original — may be past for a recurring event)",
    },
    {
      key: "endTime",
      type: "string",
      label: "End time (original — may be past for a recurring event)",
    },
    { key: "recurring", type: "boolean", label: "Whether the event recurs" },
    { key: "invitedUsers", type: "array", label: "Invited user IDs" },
    { key: "invitedGroups", type: "array", label: "Invited group IDs" },
  ],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(`/events/${encodeURIComponent(input.eventID)}`);
  },
};

export default getEvent;
