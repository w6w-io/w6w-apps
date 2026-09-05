import type { ActionDefinition } from "@w6w/types";
import { InsightlyClient } from "../lib/client.ts";
import { type ListInput, listParams, listRequest } from "../lib/params.ts";

const organisationGetMany: ActionDefinition<ListInput> = {
  key: "organisation-get-many",
  type: "search",
  resource: "organisation",
  title: "List Organisations",
  description: "List organisations, optionally filtered by a field name/value (uses Insightly's " +
    "Search endpoint when a filter field is set).",
  params: listParams,
  output: [{ key: "organisations", type: "array", label: "Organisations" }],

  async execute(input, ctx) {
    const { path, query } = listRequest("Organisations", input);
    const organisations = await new InsightlyClient(ctx).request(path, { query });
    return { organisations };
  },
};

export default organisationGetMany;
