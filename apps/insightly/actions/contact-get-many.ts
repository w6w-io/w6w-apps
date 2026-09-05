import type { ActionDefinition } from "@w6w/types";
import { InsightlyClient } from "../lib/client.ts";
import { type ListInput, listParams, listRequest } from "../lib/params.ts";

const contactGetMany: ActionDefinition<ListInput> = {
  key: "contact-get-many",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts, optionally filtered by a field name/value (uses Insightly's " +
    "Search endpoint when a filter field is set).",
  params: listParams,
  output: [{ key: "contacts", type: "array", label: "Contacts" }],

  async execute(input, ctx) {
    const { path, query } = listRequest("Contacts", input);
    const contacts = await new InsightlyClient(ctx).request(path, { query });
    return { contacts };
  },
};

export default contactGetMany;
