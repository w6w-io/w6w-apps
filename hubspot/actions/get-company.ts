import type { ActionDefinition } from "@w6w/types";
import { crmGet, type CrmGetInput } from "../lib/crm.ts";

const getCompany: ActionDefinition<CrmGetInput> = {
  key: "get-company",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Fetch a company by ID (or by any unique property via `idProperty`).",
  params: [
    { key: "id", label: "Company ID", type: "string", required: true },
    { key: "properties", label: "Properties", type: "string" },
    { key: "propertiesWithHistory", label: "Properties with history", type: "string" },
    { key: "associations", label: "Associations", type: "string", hint: "e.g. `contacts,deals`" },
    { key: "archived", label: "Include archived", type: "boolean", default: false },
    { key: "idProperty", label: "ID property", type: "string" },
  ],

  async execute(input, ctx) {
    return crmGet(ctx, "companies", input);
  },
};

export default getCompany;
