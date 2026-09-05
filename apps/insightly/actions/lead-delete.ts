import type { ActionDefinition } from "@w6w/types";
import { InsightlyClient } from "../lib/client.ts";

interface Input {
  leadId: number;
}

const leadDelete: ActionDefinition<Input> = {
  key: "lead-delete",
  type: "perform",
  resource: "lead",
  title: "Delete Lead",
  description: "Permanently delete a lead. Insightly has no trash to recover it from.",
  idempotent: true,
  params: [
    { key: "leadId", label: "Lead ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InsightlyClient(ctx).request(`/Leads/${input.leadId}`, { method: "DELETE" });
    return {};
  },
};

export default leadDelete;
