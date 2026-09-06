import type { ActionDefinition } from "@w6w/types";
import { buildBody, LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";
import { SESSION_ATTRIBUTE_PARAMS, sessionAttributes } from "../lib/sessions.ts";
import type { SessionAttributesInput } from "../lib/sessions.ts";

/**
 * `PUT /sessions/{id}` — "Fully update a session". Same field set as `PATCH`; the vendor does
 * not document how an omitted field is handled here versus `PATCH`'s partial-update semantics.
 * Prefer `session-update` (`PATCH`) unless you need this endpoint specifically.
 */
interface Input extends SessionAttributesInput {
  id: string;
}

const sessionReplace: ActionDefinition<Input> = {
  key: "session-replace",
  type: "perform",
  resource: "session",
  title: "Replace Session (Full Update)",
  description:
    "Fully update a session via PUT. Prefer Update Session (PATCH) unless you need this " +
    "endpoint specifically — see README.md.",
  idempotent: true,
  params: [
    { key: "id", label: "Session ID", type: "string", required: true },
    ...SESSION_ATTRIBUTE_PARAMS,
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const body = buildBody("sessions", sessionAttributes(input));
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>(
      `/sessions/${encodeURIComponent(input.id)}`,
      { method: "PUT", body },
    );
    return res.data;
  },
};

export default sessionReplace;
