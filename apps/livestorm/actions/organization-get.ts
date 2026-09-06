import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";

type Input = Record<string, never>;

const organizationGet: ActionDefinition<Input> = {
  key: "organization-get",
  type: "read",
  resource: "identity",
  title: "Get Current Organization",
  description: "Get the workspace (organization) the connected account belongs to.",
  params: [],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(_input, ctx) {
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>("/organization");
    return res.data;
  },
};

export default organizationGet;
