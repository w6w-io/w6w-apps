import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";

interface Input {
  id: string;
}

const peopleGet: ActionDefinition<Input> = {
  key: "people-get",
  type: "read",
  resource: "person",
  title: "Get Person",
  description: "Get a single person by ID.",
  params: [{ key: "id", label: "Person ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>(
      `/people/${encodeURIComponent(input.id)}`,
    );
    return res.data;
  },
};

export default peopleGet;
