import type { ActionDefinition } from "@w6w/types";
import { crmCreate } from "../lib/crm.ts";

interface Input {
  dealname: string;
  dealstage: string;
  pipeline?: string;
  amount?: number;
  closedate?: string;
  dealtype?: string;
  hubspot_owner_id?: string;
  description?: string;
  additionalProperties?: Record<string, unknown>;
}

const createDeal: ActionDefinition<Input> = {
  key: "create-deal",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  description: "Create a new deal. `dealstage` is required by HubSpot's data model.",
  params: [
    { key: "dealname", label: "Deal name", type: "string", required: true },
    { key: "dealstage", label: "Deal stage", type: "string", required: true },
    { key: "pipeline", label: "Pipeline", type: "string" },
    { key: "amount", label: "Amount", type: "number" },
    { key: "closedate", label: "Close date", type: "datetime" },
    { key: "dealtype", label: "Deal type", type: "string" },
    { key: "hubspot_owner_id", label: "Owner ID", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "additionalProperties", label: "Additional properties", type: "json" },
  ],

  async execute(input, ctx) {
    return crmCreate(ctx, "deals", {
      properties: {
        dealname: input.dealname,
        dealstage: input.dealstage,
        pipeline: input.pipeline,
        amount: input.amount,
        closedate: input.closedate,
        dealtype: input.dealtype,
        hubspot_owner_id: input.hubspot_owner_id,
        description: input.description,
        ...(input.additionalProperties ?? {}),
      },
    });
  },
};

export default createDeal;
