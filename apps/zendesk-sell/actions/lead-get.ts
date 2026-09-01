import type { ActionDefinition } from "@w6w/types";
import { SellClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const leadGet: ActionDefinition<Input> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Retrieve a single lead by ID.",
  params: [
    { key: "id", label: "Lead ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Lead ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    return await new SellClient(ctx).get(`/leads/${encodeURIComponent(String(input.id))}`);
  },
};

export default leadGet;
