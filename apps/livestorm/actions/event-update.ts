import type { ActionDefinition } from "@w6w/types";
import { buildBody, LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";
import { EVENT_ATTRIBUTE_PARAMS, eventAttributes } from "../lib/events.ts";
import type { EventAttributesInput } from "../lib/events.ts";

/**
 * `PATCH /events/{id}` — partially update an event. Only the fields set on the action are
 * sent, so unset fields are left unchanged. See `event-replace` for the `PUT` (full-replace)
 * sibling endpoint.
 */
interface Input extends EventAttributesInput {
  id: string;
}

const eventUpdate: ActionDefinition<Input> = {
  key: "event-update",
  type: "perform",
  resource: "event",
  title: "Update Event",
  description: "Partially update an event — only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "id", label: "Event ID", type: "string", required: true },
    ...EVENT_ATTRIBUTE_PARAMS,
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const body = buildBody("events", eventAttributes(input));
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>(
      `/events/${encodeURIComponent(input.id)}`,
      { method: "PATCH", body },
    );
    return res.data;
  },
};

export default eventUpdate;
