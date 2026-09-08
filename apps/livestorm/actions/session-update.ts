import type { ActionDefinition } from "@w6w/types";
import { buildBody, LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";
import { SESSION_ATTRIBUTE_PARAMS, sessionAttributes } from "../lib/sessions.ts";
import type { SessionAttributesInput } from "../lib/sessions.ts";

interface Input extends SessionAttributesInput {
  id: string;
}

const sessionUpdate: ActionDefinition<Input> = {
  key: "session-update",
  type: "perform",
  resource: "session",
  title: "Update Session",
  description: "Partially update a session — only the fields you set are changed.",
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
      { method: "PATCH", body },
    );
    return res.data;
  },
};

export default sessionUpdate;
