import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";

interface Input {
  sessionId: string;
  id: string;
}

const sessionPersonGet: ActionDefinition<Input> = {
  key: "session-person-get",
  type: "read",
  resource: "session",
  title: "Get Session Person",
  description: "Get one person's details for a given session.",
  params: [
    { key: "sessionId", label: "Session ID", type: "string", required: true },
    { key: "id", label: "Person (Contact) ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>(
      `/sessions/${encodeURIComponent(input.sessionId)}/people/${encodeURIComponent(input.id)}`,
    );
    return res.data;
  },
};

export default sessionPersonGet;
