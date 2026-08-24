import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const funnelGet: ActionDefinition<Input> = {
  key: "funnel-get",
  type: "read",
  resource: "funnel",
  title: "Get Funnel",
  description: "Retrieve a single Funnel resource by id.",
  params: [
    { key: "id", label: "Funnel ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Funnel ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "isActive", type: "boolean", label: "Active" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get(`/api/funnels/${encodeURIComponent(input.id)}`);
  },
};

export default funnelGet;
