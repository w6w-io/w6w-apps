import type { ActionDefinition } from "@w6w/types";
import { crmList, type CrmListInput } from "../lib/crm.ts";

const listContacts: ActionDefinition<CrmListInput> = {
  key: "list-contacts",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts. Walks one page; pass back `paging.next.after` as `after` for the next.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "after", label: "After (cursor)", type: "string" },
    { key: "properties", label: "Properties", type: "string" },
    { key: "propertiesWithHistory", label: "Properties with history", type: "string" },
    { key: "associations", label: "Associations", type: "string" },
    { key: "archived", label: "Include archived", type: "boolean", default: false },
  ],
  output: [
    { key: "results", type: "array", label: "Contacts" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  async execute(input, ctx) {
    return crmList(ctx, "contacts", input);
  },
};

export default listContacts;
