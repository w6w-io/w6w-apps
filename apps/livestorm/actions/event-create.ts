import type { ActionDefinition } from "@w6w/types";
import { buildBody, LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";
import { EVENT_ATTRIBUTE_PARAMS, eventAttributes } from "../lib/events.ts";
import type { EventAttributesInput } from "../lib/events.ts";

/** `POST /events` — create an event. Every attribute is optional per the vendor's schema. */
interface Input extends EventAttributesInput {
  copyFromEventId?: string;
}

const eventCreate: ActionDefinition<Input> = {
  key: "event-create",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description: "Create a new event (webinar/meeting), optionally copying settings from another.",
  idempotent: false,
  params: [
    {
      key: "copyFromEventId",
      label: "Copy settings from event ID",
      type: "string",
      hint: "Clones another event's configuration.",
    },
    ...EVENT_ATTRIBUTE_PARAMS,
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const attrs = eventAttributes(input);
    if (input.copyFromEventId) attrs.copy_from_event_id = input.copyFromEventId;
    const body = buildBody("events", attrs);
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>("/events", {
      method: "POST",
      body,
    });
    return res.data;
  },
};

export default eventCreate;
