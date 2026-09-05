import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/events/{eventID}/instances` — every occurrence of a recurring event. */
interface Input {
  eventID: string;
}

const listEventInstances: ActionDefinition<Input> = {
  key: "list-event-instances",
  type: "read",
  resource: "event",
  title: "List Event Instances",
  description: "Return every occurrence of a recurring event, past and future.",
  params: [{ key: "eventID", label: "Event ID", type: "string", required: true }],
  output: [{ key: "instances", type: "array", label: "Instances — [{startTime, endTime}]" }],

  async execute(input, ctx) {
    const instances = await new HeartbeatClient(ctx).json(
      `/events/${encodeURIComponent(input.eventID)}/instances`,
    );
    return { instances };
  },
};

export default listEventInstances;
