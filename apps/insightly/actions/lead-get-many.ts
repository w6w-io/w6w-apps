import type { ActionDefinition } from "@w6w/types";
import { InsightlyClient } from "../lib/client.ts";
import { type ListInput, listParams, listRequest } from "../lib/params.ts";

const leadGetMany: ActionDefinition<ListInput> = {
  key: "lead-get-many",
  type: "search",
  resource: "lead",
  title: "List Leads",
  description: "List leads, optionally filtered by a field name/value (uses Insightly's Search " +
    "endpoint when a filter field is set).",
  params: listParams,
  output: [{ key: "leads", type: "array", label: "Leads" }],

  async execute(input, ctx) {
    const { path, query } = listRequest("Leads", input);
    const leads = await new InsightlyClient(ctx).request(path, { query });
    return { leads };
  },
};

export default leadGetMany;
