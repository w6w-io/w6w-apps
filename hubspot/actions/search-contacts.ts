import type { ActionDefinition } from "@w6w/types";
import { crmSearch, type CrmSearchInput } from "../lib/crm.ts";

const searchContacts: ActionDefinition<CrmSearchInput> = {
  key: "search-contacts",
  type: "search",
  resource: "contact",
  title: "Search Contacts",
  description: "POST /crm/v3/objects/contacts/search. Up to 3 filter groups, OR'd together.",
  params: [
    { key: "query", label: "Query", type: "string", hint: "Full-text search across default properties." },
    {
      key: "filterGroups",
      label: "Filter groups",
      type: "json",
      hint: "Array of `{ filters: [{ propertyName, operator, value }] }`. Max 3.",
    },
    { key: "sorts", label: "Sorts", type: "json" },
    { key: "properties", label: "Properties to return", type: "json" },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "after", label: "After (cursor)", type: "string" },
  ],

  async execute(input, ctx) {
    return crmSearch(ctx, "contacts", input);
  },
};

export default searchContacts;
