import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";

interface Input {
  id: string;
}

const sessionGet: ActionDefinition<Input> = {
  key: "session-get",
  type: "read",
  resource: "session",
  title: "Get Session",
  description: "Get a single session by ID.",
  params: [{ key: "id", label: "Session ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>(
      `/sessions/${encodeURIComponent(input.id)}`,
    );
    return res.data;
  },
};

export default sessionGet;
