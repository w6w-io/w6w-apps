import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";

interface Input {
  id: string;
}

const eventGet: ActionDefinition<Input> = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Get a single event by ID.",
  params: [{ key: "id", label: "Event ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>(
      `/events/${encodeURIComponent(input.id)}`,
    );
    return res.data;
  },
};

export default eventGet;
