import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/events?groupID=` — every event, optionally scoped to one group's invitees. */
interface Input {
  groupID?: string;
}

const listEvents: ActionDefinition<Input> = {
  key: "list-events",
  type: "search",
  resource: "event",
  title: "List Events",
  description: "Return every event in the community, optionally filtered to one invited group.",
  params: [{ key: "groupID", label: "Group ID filter", type: "string" }],
  output: [{ key: "events", type: "array", label: "Events" }],

  async execute(input, ctx) {
    const events = await new HeartbeatClient(ctx).json("/events", {
      query: { groupID: input.groupID },
    });
    return { events };
  },
};

export default listEvents;
