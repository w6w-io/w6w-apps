import type { ActionDefinition } from "@w6w/types";
import { buildBody, LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";
import { PERSON_ATTRIBUTE_PARAMS, personAttributes } from "../lib/people.ts";
import type { PersonAttributesInput } from "../lib/people.ts";

/**
 * `POST /sessions/{id}/people` — register a new participant (or internal team member) for a
 * session. Registration data is a dynamic `fields: [{id, value}]` array keyed by People
 * Attribute slug — pass at least `{id: "email", value: "..."}` — not top-level `email`/
 * `first_name` keys. See this app's README for the full finding.
 */
interface Input extends PersonAttributesInput {
  id: string;
}

const sessionPersonRegister: ActionDefinition<Input> = {
  key: "session-person-register",
  type: "perform",
  resource: "session",
  title: "Register Person for Session",
  description: "Register a new participant for a session. Pass registration data as {id, value} " +
    'People Attribute pairs in "Fields" (e.g. id "email", id "first_name") — see README.md.',
  idempotent: false,
  params: [
    { key: "id", label: "Session ID", type: "string", required: true },
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
      `/sessions/${encodeURIComponent(input.id)}/people`,
      { method: "POST", body },
    );
    return res.data;
  },
};

export default sessionPersonRegister;
