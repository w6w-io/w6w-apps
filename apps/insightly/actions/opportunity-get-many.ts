import type { ActionDefinition } from "@w6w/types";
import { InsightlyClient } from "../lib/client.ts";
import { type ListInput, listParams, listRequest } from "../lib/params.ts";

const opportunityGetMany: ActionDefinition<ListInput> = {
  key: "opportunity-get-many",
  type: "search",
  resource: "opportunity",
  title: "List Opportunities",
  description: "List opportunities, optionally filtered by a field name/value (uses Insightly's " +
    "Search endpoint when a filter field is set).",
  params: listParams,
  output: [{ key: "opportunities", type: "array", label: "Opportunities" }],

  async execute(input, ctx) {
    const { path, query } = listRequest("Opportunities", input);
    const opportunities = await new InsightlyClient(ctx).request(path, { query });
    return { opportunities };
  },
};

export default opportunityGetMany;
