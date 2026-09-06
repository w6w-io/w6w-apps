import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient } from "../lib/client.ts";

/** `GET /broadcasts/{id}` — a single broadcast, with its parent episode and webinar nested. */
interface Input {
  id: number;
}

const broadcastGet: ActionDefinition<Input> = {
  key: "broadcast-get",
  type: "read",
  resource: "broadcast",
  title: "Get Broadcast",
  description: "Retrieve a specific broadcast by ID.",
  params: [
    { key: "id", label: "Broadcast ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Broadcast ID" },
    { key: "date", type: "number", label: "Date (Unix timestamp)" },
    { key: "has_ended", type: "boolean", label: "Has ended" },
    { key: "cancelled", type: "boolean", label: "Cancelled" },
    { key: "subscriptions_count", type: "number", label: "Subscriptions" },
    { key: "viewers_count", type: "number", label: "Viewers" },
    { key: "episode", type: "object", label: "Parent episode" },
    { key: "webinar", type: "object", label: "Parent webinar" },
  ],

  execute(input, ctx) {
    return new WebinarGeekClient(ctx).request(`/broadcasts/${input.id}`);
  },
};

export default broadcastGet;
