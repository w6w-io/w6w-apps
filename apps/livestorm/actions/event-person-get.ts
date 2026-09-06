import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";

interface Input {
  eventId: string;
  id: string;
}

const eventPersonGet: ActionDefinition<Input> = {
  key: "event-person-get",
  type: "read",
  resource: "event",
  title: "Get Event Person",
  description: "Get one person's details for a given event.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "id", label: "Person ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>(
      `/events/${encodeURIComponent(input.eventId)}/people/${encodeURIComponent(input.id)}`,
    );
    return res.data;
  },
};

export default eventPersonGet;
