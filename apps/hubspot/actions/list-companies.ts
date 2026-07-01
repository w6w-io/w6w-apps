import type { ActionDefinition } from "@w6w/types";
import { crmList, type CrmListInput } from "../lib/crm.ts";

const listCompanies: ActionDefinition<CrmListInput> = {
  key: "list-companies",
  type: "read",
  resource: "company",
  title: "List Companies",
  description: "List companies. Walks one page; pass back `paging.next.after` as `after` for the next.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "after", label: "After (cursor)", type: "string" },
    { key: "properties", label: "Properties", type: "string" },
    { key: "propertiesWithHistory", label: "Properties with history", type: "string" },
    { key: "associations", label: "Associations", type: "string" },
    { key: "archived", label: "Include archived", type: "boolean", default: false },
  ],
  output: [
    { key: "results", type: "array", label: "Companies" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  async execute(input, ctx) {
    return crmList(ctx, "companies", input);
  },
};

export default listCompanies;
