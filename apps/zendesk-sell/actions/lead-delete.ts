import type { ActionDefinition } from "@w6w/types";
import { SellClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const leadDelete: ActionDefinition<Input> = {
  key: "lead-delete",
  type: "perform",
  resource: "lead",
  title: "Delete Lead",
  description: "Delete a lead. Cannot be undone.",
  idempotent: true,
  params: [
    { key: "id", label: "Lead ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new SellClient(ctx).remove(`/leads/${encodeURIComponent(String(input.id))}`);
    return {};
  },
};

export default leadDelete;
