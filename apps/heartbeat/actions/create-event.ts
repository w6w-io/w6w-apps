import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient, toList } from "../lib/client.ts";

/**
 * `PUT /v0/events` — create an event.
 *
 * `location` is a single string with three meanings, per the vendor: the
 * literal value `"HEARTBEAT"` puts it in a Heartbeat voice channel, the
 * literal value `"ZOOM"` uses a Zoom account already integrated with
 * Heartbeat, and anything else is passed straight through as a custom
 * location string.
 */
interface Input {
  name: string;
  description?: string;
  startTime: string;
  duration: number;
  location: string;
  invitedUsers?: string[] | string;
  invitedGroups?: string[] | string;
}

const createEvent: ActionDefinition<Input> = {
  key: "create-event",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description:
    "Create a new event. If both Invited users and Invited groups are empty, the event is open " +
    "to the whole community.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "startTime", label: "Start time", type: "datetime", required: true },
    { key: "duration", label: "Duration (minutes)", type: "number", required: true },
    {
      key: "location",
      label: "Location",
      type: "string",
      required: true,
      hint: 'Use the literal "HEARTBEAT" for a Heartbeat voice channel, "ZOOM" for an integrated ' +
        "Zoom link, or any other string as a custom location.",
    },
    {
      key: "invitedUsers",
      label: "Invited user emails",
      type: "multiselect",
      hint: "A non-member email gets a direct event invite rather than a Heartbeat invite.",
    },
    { key: "invitedGroups", label: "Invited group IDs", type: "multiselect" },
  ],
  output: [],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json("/events", {
      method: "PUT",
      body: compact({
        name: input.name,
        description: input.description,
        startTime: input.startTime,
        duration: input.duration,
        location: input.location,
        invitedUsers: toList(input.invitedUsers),
        invitedGroups: toList(input.invitedGroups),
      }),
    });
  },
};

export default createEvent;
