import type { ActionDefinition } from "@w6w/types";
import { buildBody, LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";

interface Input {
  id: string;
  title: string;
}

const eventTagAssign: ActionDefinition<Input> = {
  key: "event-tag-assign",
  type: "perform",
  resource: "event",
  title: "Assign Tag to Event",
  description: "Assign a tag to an event (creating the tag if it does not already exist).",
  idempotent: true,
  params: [
    { key: "id", label: "Event ID", type: "string", required: true },
    { key: "title", label: "Tag title", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const body = buildBody("tags", { title: input.title });
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>(
      `/events/${encodeURIComponent(input.id)}/tags`,
      { method: "POST", body },
    );
    return res.data;
  },
};

export default eventTagAssign;
