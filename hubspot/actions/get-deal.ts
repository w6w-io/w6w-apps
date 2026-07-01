import type { ActionDefinition } from "@w6w/types";
import { crmGet, type CrmGetInput } from "../lib/crm.ts";

const getDeal: ActionDefinition<CrmGetInput> = {
  key: "get-deal",
  type: "read",
  resource: "deal",
  title: "Get Deal",
  description: "Fetch a deal by ID.",
  params: [
    { key: "id", label: "Deal ID", type: "string", required: true },
    { key: "properties", label: "Properties", type: "string" },
    { key: "propertiesWithHistory", label: "Properties with history", type: "string" },
    { key: "associations", label: "Associations", type: "string" },
    { key: "archived", label: "Include archived", type: "boolean", default: false },
    { key: "idProperty", label: "ID property", type: "string" },
  ],

  async execute(input, ctx) {
    return crmGet(ctx, "deals", input);
  },
};

export default getDeal;
