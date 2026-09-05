import type { ActionDefinition } from "@w6w/types";
import { InsightlyClient } from "../lib/client.ts";

interface Input {
  leadId: number;
}

const leadGet: ActionDefinition<Input> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Fetch a single lead by ID.",
  params: [
    { key: "leadId", label: "Lead ID", type: "number", required: true },
  ],
  output: [
    { key: "LEAD_ID", type: "number", label: "Lead ID" },
    { key: "FIRST_NAME", type: "string", label: "First name" },
    { key: "LAST_NAME", type: "string", label: "Last name" },
  ],

  execute(input, ctx) {
    return new InsightlyClient(ctx).request(`/Leads/${input.leadId}`);
  },
};

export default leadGet;
