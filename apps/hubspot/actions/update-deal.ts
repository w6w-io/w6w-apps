import type { ActionDefinition } from "@w6w/types";
import { crmUpdate } from "../lib/crm.ts";

interface Input {
  id: string;
  properties: Record<string, unknown>;
  idProperty?: string;
}

const updateDeal: ActionDefinition<Input> = {
  key: "update-deal",
  type: "perform",
  resource: "deal",
  title: "Update Deal",
  description: "Patch a deal's properties.",
  params: [
    { key: "id", label: "Deal ID", type: "string", required: true },
    { key: "properties", label: "Properties", type: "json", required: true },
    { key: "idProperty", label: "ID property", type: "string" },
  ],

  async execute(input, ctx) {
    return crmUpdate(ctx, "deals", input);
  },
};

export default updateDeal;
