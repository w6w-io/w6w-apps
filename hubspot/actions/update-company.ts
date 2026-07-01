import type { ActionDefinition } from "@w6w/types";
import { crmUpdate } from "../lib/crm.ts";

interface Input {
  id: string;
  properties: Record<string, unknown>;
  idProperty?: string;
}

const updateCompany: ActionDefinition<Input> = {
  key: "update-company",
  type: "perform",
  resource: "company",
  title: "Update Company",
  description: "Patch a company's properties.",
  params: [
    { key: "id", label: "Company ID", type: "string", required: true },
    { key: "properties", label: "Properties", type: "json", required: true },
    { key: "idProperty", label: "ID property", type: "string" },
  ],

  async execute(input, ctx) {
    return crmUpdate(ctx, "companies", input);
  },
};

export default updateCompany;
