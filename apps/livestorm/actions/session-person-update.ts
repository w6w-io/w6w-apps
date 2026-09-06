import type { ActionDefinition } from "@w6w/types";
import { buildBody, LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";
import { PERSON_ATTRIBUTE_PARAMS, personAttributes } from "../lib/people.ts";
import type { PersonAttributesInput } from "../lib/people.ts";

interface Input extends PersonAttributesInput {
  sessionId: string;
  id: string;
}

const sessionPersonUpdate: ActionDefinition<Input> = {
  key: "session-person-update",
  type: "perform",
  resource: "session",
  title: "Update Session Person",
  description:
    "Update a contact's People Attributes for a session. Attributes are sent as {id, value} " +
    "pairs, not top-level keys — see this app's README.",
  idempotent: true,
  params: [
    { key: "sessionId", label: "Session ID", type: "string", required: true },
    { key: "id", label: "Person (Contact) ID", type: "string", required: true },
    ...PERSON_ATTRIBUTE_PARAMS,
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const body = buildBody("people", personAttributes(input));
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>(
      `/sessions/${encodeURIComponent(input.sessionId)}/people/${encodeURIComponent(input.id)}`,
      { method: "PATCH", body },
    );
    return res.data;
  },
};

export default sessionPersonUpdate;
