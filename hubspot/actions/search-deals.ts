import type { ActionDefinition } from "@w6w/types";
import { crmSearch, type CrmSearchInput } from "../lib/crm.ts";

const searchDeals: ActionDefinition<CrmSearchInput> = {
  key: "search-deals",
  type: "search",
  resource: "deal",
  title: "Search Deals",
  description: "POST /crm/v3/objects/deals/search.",
  params: [
    { key: "query", label: "Query", type: "string" },
    { key: "filterGroups", label: "Filter groups", type: "json" },
    { key: "sorts", label: "Sorts", type: "json" },
    { key: "properties", label: "Properties to return", type: "json" },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "after", label: "After (cursor)", type: "string" },
  ],

  async execute(input, ctx) {
    return crmSearch(ctx, "deals", input);
  },
};

export default searchDeals;
