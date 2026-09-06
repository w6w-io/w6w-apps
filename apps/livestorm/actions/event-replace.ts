import type { ActionDefinition } from "@w6w/types";
import { buildBody, LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";
import { EVENT_ATTRIBUTE_PARAMS, eventAttributes } from "../lib/events.ts";
import type { EventAttributesInput } from "../lib/events.ts";

/**
 * `PUT /events/{id}` — "Fully update an event". The vendor's own request schema for `PUT` is
 * field-for-field identical to `PATCH`'s (every attribute optional) — Livestorm's docs do not
 * state whether an attribute left unset here is reset to a default or left untouched, unlike
 * `PATCH`'s documented partial-update semantics. Prefer `event-update` (`PATCH`) unless you
 * specifically need this vendor-documented endpoint; see `README.md`.
 */
interface Input extends EventAttributesInput {
  id: string;
}

const eventReplace: ActionDefinition<Input> = {
  key: "event-replace",
  type: "perform",
  resource: "event",
  title: "Replace Event (Full Update)",
  description:
    "Fully update an event via PUT. The vendor does not document whether omitted fields " +
    "reset to a default — prefer Update Event (PATCH) unless you need this endpoint specifically.",
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
      { method: "PUT", body },
    );
    return res.data;
  },
};

export default eventReplace;
